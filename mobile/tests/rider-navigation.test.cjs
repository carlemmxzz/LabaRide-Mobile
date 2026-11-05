const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
function load(name) {
 const module = { exports: {} };
 const source = fs.readFileSync(path.resolve(__dirname, '../src/design/' + name + '.ts'), 'utf8');
 const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','require',code)(module,module.exports,request=>load(request.replace('./','')));
 return module.exports;
}
const { navigationPoint, riderDirectionsUrl, parseNavigationRoute } = load('rider-navigation');
test('navigation accepts saved pins including decimal strings and zero without guessing from an address', () => {
 assert.deepEqual(navigationPoint({latitude:'0',longitude:'123.19',address:'Other location'}),{latitude:0,longitude:123.19});
 for(const latitude of [null,undefined,'',' ','NaN',91,Infinity]) assert.equal(navigationPoint({latitude,longitude:123,address:'Naga'}),null);
 assert.equal(navigationPoint({latitude:13,longitude:181}),null);
});
test('navigation requests Mapbox road geometry and instructions from GPS to the chosen stop', () => {
 const url = new URL(riderDirectionsUrl({latitude:13.62,longitude:123.19},{latitude:13.63,longitude:123.2},'pk.test'));
 assert.equal(url.hostname,'api.mapbox.com');assert.ok(url.pathname.endsWith('/123.19,13.62;123.2,13.63'));
 assert.equal(url.searchParams.get('steps'),'true');assert.equal(url.searchParams.get('geometries'),'geojson');
});
test('navigation preserves road geometry, distance and driving instructions', () => {
 const geometry={type:'LineString',coordinates:[[123.19,13.62],[123.195,13.625],[123.2,13.63]]};
 const result=parseNavigationRoute({code:'Ok',routes:[{distance:2100,duration:480,geometry,legs:[{steps:[{distance:400,maneuver:{instruction:'Turn right onto Main Street'}},{distance:-1,maneuver:{instruction:'Invalid'}}]}]}]});
 assert.deepEqual(result.coordinates,geometry.coordinates);assert.equal(result.distanceMeters,2100);assert.equal(result.durationSeconds,480);
 assert.deepEqual(result.steps,[{instruction:'Turn right onto Main Street',distanceMeters:400}]);
});
test('routing failures and invalid geometry cannot become a misleading straight line', () => {
 for(const value of [null,{code:'NoRoute',routes:[]},{code:'Ok',routes:[{distance:1,duration:1,geometry:{type:'LineString',coordinates:[[123,13]]}}]}]) assert.throws(()=>parseNavigationRoute(value),/No driving route/);
});
