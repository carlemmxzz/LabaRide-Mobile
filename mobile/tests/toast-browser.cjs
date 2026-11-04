// Requires a running Expo web dev server. Uses isolated API fixtures only.
const fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), artifacts = path.join(root, '.expo/toast-check');
const base = process.env.TOAST_TEST_URL || 'http://127.0.0.1:8081', sleep = ms => new Promise(r => setTimeout(r, ms));
let browser, socket, id = 0, scriptId, user, errors = [];
const pending = new Map();
function cdp(method, params = {}) { const n = ++id; return new Promise((resolve, reject) => { const timer = setTimeout(() => { pending.delete(n); reject(Error(method + ' timed out')); }, 30000); pending.set(n, { resolve, reject, timer }); socket.send(JSON.stringify({ id: n, method, params })); }); }
async function ev(expression) {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails)
        throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
}
async function wait(expression, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
        try {
            if (await ev(expression))
                return;
        }
        catch (e) {
            if (!/context|undefined|null/.test(e.message))
                throw e;
        }
        await sleep(150);
    }
    throw Error('Not ready: ' + expression + '\n' + await ev('document.body.innerText'));
}
const card = '[data-testid^="toast-"]:not([data-testid="toast-host"])', selector = 'document.querySelector(' + JSON.stringify(card) + ')', count = 'document.querySelectorAll(' + JSON.stringify(card) + ').length';
async function clear() { await ev('labarideToast.dismiss()'); await wait(count + ' === 0'); }
async function fire(variant, options = {}) { await wait('!!globalThis.labarideToast'); await ev('labarideToast.' + variant + '(' + JSON.stringify({ title: 'Test notification', duration: 30000, ...options }) + ')'); await wait(count + ' > 0'); await sleep(550); }
async function rect() { return ev('(()=>{const r=' + selector + '.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()'); }
async function drag(dy) {
    const r = await rect(), x = r.x + r.width / 2, y = r.y + r.height - 12;
    const scroll = 'Array.from(document.querySelectorAll("*")).map(e=>e.scrollTop).filter(Boolean).join(",")', before = await ev(scroll);
    await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 5; i++) {
        await sleep(120);
        await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + dy * i / 5 }] });
    }
    const moved = await rect();
    await sleep(120);
    await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(600);
    assert.equal(await ev(scroll), before, 'Toast drag must not scroll');
    return { start: r, moved };
}
async function visit(role, route, color, reduced = false) {
    errors = [];
    user = { id: 7, name: 'Toast Test', email: 'toast@example.test', isShopOwner: role === 'shop', isAdmin: role === 'admin', isRider: role === 'rider', riderApplicationStatus: role === 'rider' ? 'Approved' : undefined };
    if (scriptId)
        await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
    ({ identifier: scriptId } = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'sessionStorage.setItem("auth_token","isolated-toast-test");sessionStorage.setItem("auth_user",' + JSON.stringify(JSON.stringify(user)) + ');' }));
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
    await ev('delete globalThis.labarideToast');
    await cdp('Page.navigate', { url: base + route });
    await wait('location.pathname === ' + JSON.stringify(route) + ' && !!globalThis.labarideToast && document.body.innerText.includes("Notifications")', 180000);
    await sleep(1000);
    assert.equal(await ev(count), 0, 'No backlog');
    await fire('info', { title: role + ' palette', message: 'A notification with the active role colors.' });
    assert.equal(await ev(selector + '.querySelector("svg").getAttribute("stroke")'), color);
    const bounds = await rect();
    assert.equal(bounds.x, 12);
    assert.equal(bounds.width, 366);
    assert.ok(bounds.y >= 11.5);
    const shot = await cdp('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifacts, role + (reduced ? '-reduced' : '') + '.png'), Buffer.from(shot.data, 'base64'));
    assert.deepEqual(errors, [], 'Runtime errors');
    console.log('PASS palette, placement and backlog:', role, reduced ? 'reduced motion' : '');
}
(async () => {
    assert.ok((await fetch(base, { signal: AbortSignal.timeout(10000) })).ok, "Start the Expo web server before running this test");
    fs.mkdirSync(artifacts, { recursive: true });
    browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9236', '--user-data-dir=' + path.join(artifacts, 'chrome-profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let target;
    for (let i = 0; i < 100; i++) {
        try {
            target = (await (await fetch('http://127.0.0.1:9236/json')).json()).find(t => t.type === 'page');
            if (target)
                break;
        }
        catch { }
        await sleep(100);
    }
    assert.ok(target, 'Chrome debugging unavailable');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => socket.addEventListener('open', r, { once: true }));
    socket.addEventListener('message', async (event) => {
        const m = JSON.parse(event.data);
        if (m.id) {
            const p = pending.get(m.id);
            if (!p)
                return;
            pending.delete(m.id);
            clearTimeout(p.timer);
            m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result);
            return;
        }
        if (m.method === 'Runtime.exceptionThrown')
            errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error('BROWSER', m.params.args.map(a => a.value || a.description || '').join(' '));
        if (m.method === 'Fetch.requestPaused') {
            try {
                const { requestId, request } = m.params, e = new URL(request.url).pathname;
                const shop = { id: 101, userId: 7, shopName: 'Toast Laundry', approvalStatus: 'Approved', services: [], kiloPrices: [], clothingTypes: [], householdItems: [] };
                const data = e.includes('/auth/') ? { user, token: 'isolated-toast-test' } : e.includes('/users/') ? user : e === '/api/shops' ? [shop] : e.endsWith('/analytics') ? { range: { start: '2026-11-01', end: '2026-11-04', granularity: 'day', timeZone: 'Asia/Manila' }, summary: { orders: 0, completedOrders: 0, completedValue: 0, kilos: 0 }, series: [{ date: "2026-11-04", orders: 0, completedOrders: 0, completedValue: 0, kilos: 0 }], popularServices: [], workload: { pending: 0, queued: 0, ready: 0 }, undatedCompletedOrders: 0 } : e.startsWith('/api/shops/') ? shop : e === '/api/delivery/rider' ? { rider: { online: false }, jobs: [] } : e === '/api/delivery/operations' ? { orders: [], riders: [] } : e === '/api/notifications' ? [{ id: 1, transactionId: 42, title: 'Existing order', message: 'Backlog stays silent.', createdAt: '2026-01-01T00:00:00Z', readAt: null }] : [];
                await cdp('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET, PUT, POST, DELETE, OPTIONS' }], body: Buffer.from(JSON.stringify({ success: true, data })).toString('base64') });
            }
            catch (e) {
                errors.push(e.message);
            }
        }
    });
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
    await visit('customer', '/notifications', '#2457AD');
    if (!process.argv.includes('--roles-only')) {
        await clear();
        await ev('["success","info","warning","error"].forEach((v,i)=>labarideToast[v]({title:v,key:"variant-"+i,duration:30000}))');
        await sleep(700);
        assert.equal(await ev(count), 3);
        assert.deepEqual(await ev('labarideToast.getSnapshot().map(t=>t.variant)'), ['error', 'warning', 'info']);
        await ev('labarideToast.info({title:"Replacement",key:"variant-1",duration:30000})');
        assert.equal(await ev('labarideToast.getSnapshot()[0].title'), 'Replacement');
        assert.equal(await ev(count), 3);
        await clear();
        await fire('error', { title: 'Accessible error' });
        assert.equal(await ev(selector + '.querySelector("[role=alert]") !== null'), true);
        await ev('document.querySelector("[aria-label=\\"Dismiss notification\\"]").click()');
        await wait(count + ' === 0');
        console.log('PASS stack, dedupe, alert role and X');
        await fire('success', { title: 'Touch pause', duration: 1600 });
        let r = await rect();
        await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + 100, y: r.y + 25 }] });
        await sleep(1800);
        assert.equal(await ev('labarideToast.getSnapshot().length'), 1);
        await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await wait(count + ' === 0', 4000);
        await fire('success', { title: 'Swipe test' });
        let result = await drag(-20);
        assert.equal(await ev(count), 1);
        assert.ok(Math.abs((await rect()).y - result.start.y) < 1, 'Short drag springs back');
        result = await drag(40);
        assert.ok(result.moved.y - result.start.y > 0 && result.moved.y - result.start.y < 10, 'Downward resistance');
        await drag(-60);
        await wait(count + ' === 0');
        console.log('PASS pause, swipe, snapback, resistance, no scrolling');
        await ev('globalThis.toastBodyCount=0;globalThis.toastActionCount=0;labarideToast.info({title:"Actions",duration:30000,onPress:()=>toastBodyCount++,action:{label:"Test action",onPress:()=>toastActionCount++}})');
        await sleep(600);
        await ev('document.querySelector("[aria-label=\\"Test action\\"]").click()');
        assert.equal(await ev('toastActionCount'), 1);
        assert.equal(await ev('toastBodyCount'), 0);
        await wait(count + ' === 0');
        await ev('labarideToast.info({title:"Body action",duration:30000,onPress:()=>toastBodyCount++})');
        await sleep(600);
        await ev(selector + '.querySelector("[role=button]").click()');
        assert.equal(await ev('toastBodyCount'), 1);
        await wait(count + ' === 0');
        await ev('void labarideToastDialog({title:"Toast queue test",message:"Close to see the queued toast.",kind:"notice"});labarideToast.success({title:"Queued notification",duration:1200})');
        await sleep(1600);
        assert.equal(await ev(count), 0);
        assert.equal(await ev('labarideToast.getSnapshot().length'), 1);
        await ev('Array.from(document.querySelectorAll("[role=button]")).find(e=>e.textContent.trim()==="Got it").click()');
        await wait(count + ' === 1');
        await wait(count + ' === 0', 4000);
        console.log('PASS independent actions and dialog queue');
    }
    await visit('shop', '/shop/home/shop-notifications', '#321078');
    await visit('admin', '/admin/notifications', '#0F4766');
    await visit('rider', '/rider/notifications', '#2457AD');
    await visit('customer', '/notifications', '#2457AD', true);
    await clear();
    await ev('labarideToast.info({title:"Reduced motion",duration:30000})');
    await sleep(50);
    assert.ok(Math.abs((await rect()).y - 12) < 1, 'Reduced motion must not slide');
    console.log('PASS reduced-motion fade');
    console.log('All toast browser checks passed. Screenshots:', artifacts);
})().catch(async (e) => { console.error(e); try {
    console.error(await ev('JSON.stringify({body:document.body.innerText,path:location.pathname,debug:!!globalThis.labarideToast})'));
}
catch { } process.exitCode = 1; }).finally(async () => {
    if (socket?.readyState === 1) {
        try {
            await cdp('Browser.close');
        }
        catch { }
        socket.close();
    }
    for (const p of pending.values())
        clearTimeout(p.timer);
    browser?.kill();
});
