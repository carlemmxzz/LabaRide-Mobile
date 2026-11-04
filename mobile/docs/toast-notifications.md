# Global toast implementation report

The app now has one global toast host, local action feedback, and foreground notification toasts. No toast library or new dependency was added.

## Files

Created:

- [toast-service.ts](../src/design/toast-service.ts): imperative API, timers, three-item queue, keyed replacement, pause/resume and blockers.
- [ToastHost.tsx](../src/design/ToastHost.tsx): themed cards, gestures, animation, accessibility, dialog coordination and development triggers.
- [notification-toast-state.ts](../src/design/notification-toast-state.ts): notification baselines, visible-item tracking and local-mutation suppression.
- [useNotificationToasts.ts](../src/design/useNotificationToasts.ts): shared notifications query, foreground handling and role-specific order links.
- [toast-service.test.cjs](../tests/toast-service.test.cjs): queue, timer, notification tracking and routing tests.
- [toast-browser.cjs](../tests/toast-browser.cjs): isolated Chrome interaction checks.
- This report.

Changed:

- [app/_layout.tsx](../app/_layout.tsx): exactly one ToastHost inside InterfaceTheme beside AppDialogHost.
- [app/rider/jobs.tsx](../app/rider/jobs.tsx): accepts an orderId from a toast and shows that order's assigned jobs, including past jobs. Missing access shows Job unavailable; Show all jobs clears the filter.
- Local feedback: AuthScreens.tsx, CallContactButton.tsx, DeliverySchedule.tsx, DeliveryScreens.tsx, ProfilePhotoControl.tsx, ProfileScreens.tsx, RiderAvailableJobs.tsx, RiderLocationSharing.tsx, RiderRequirementsScreens.tsx, ShopApprovalScreens.tsx, ShopPhotoEditor.tsx, ShopRequirements.tsx, ShopScreens.tsx.
- Shared notification observers: NotificationsScreen.tsx and RecentNotificationsModal.tsx.
- [data.ts](../src/design/data.ts): fail() uses normalized error toasts; order mutation wrappers track local events without changing network payloads.
- Existing test fixtures: address-return.test.cjs, notifications.test.cjs, schedule.test.cjs, services.test.cjs, shop-details.test.cjs and the contact-copy scenario in ui-browser.cjs.

The pre-existing changes in LaundryMap.web.tsx, jobRouteMapHtml.ts, riderTrackingMapHtml.ts and rider-tracking-map.test.cjs were left intact. Server code, schemas, dependencies, lockfiles, auth logic, console logging and constants/colors.ts were not changed.

## API and development controls

```tsx
import { toast } from "./toast-service";

const id = toast.success({
  title: "Profile updated",
  message: "Your changes are saved.",
  key: "profile-save",
});

toast.info({
  title: "Order updated",
  message: "Your laundry is ready.",
  key: "order-42",
  duration: 6000,
  onPress: openOrder,
  action: { label: "View order", onPress: openOrder },
});

toast.dismiss(id);          // also accepts the caller's key
toast.dismiss();            // dismiss all
```

success, info, warning and error take the same options and return an ID. Default duration is 4,000 ms, or 6,000 ms for errors and cards with actions. A duplicate key replaces the card, moves it to the top and restarts its duration. The queue holds at most three items, including while blocked.

In a development build, use the browser console or React Native DevTools console after the app mounts:

```js
["success", "info", "warning", "error"].forEach(variant =>
  globalThis.labarideToast[variant]({
    title: variant + " example",
    message: "This is a development notification.",
    duration: 10000,
    key: variant,
  })
);
// Four calls deliberately demonstrate oldest-item eviction.
globalThis.labarideToast.dismiss();

void globalThis.labarideToastDialog({
  kind: "notice",
  title: "Queue test",
  message: "Close this dialog to show the queued toast.",
});
globalThis.labarideToast.success({ title: "Queued notification" });
```

These globals are installed only under __DEV__ and removed when the host unmounts. Switch between customer, shop, admin and rider routes to check palette changes.

## UI, animation and gestures

The host reads usePalette() at render time: customer/rider blue, shop purple and admin blue-teal. It uses the existing Inter text component, Lucide icons and semantic colors. Cards have the requested 20 px radius, 12 px horizontal margins, popover shadow, icon tile, close button, grab pill and shrinking progress bar. Top placement is safe-area inset plus 12 px.

The implementation uses React Native Animated and PanResponder, matching the app's existing dialog/panel approach. Reanimated and Gesture Handler are installed, but there was no established app-level gesture integration or demonstrated web configuration to reuse. No dependency or Babel configuration was added. Transform/opacity animations use the native driver only on native; the width progress bar uses the JS driver.

Upward drags dismiss above 40 px or 0.5 px/ms. Short drags spring back; downward movement is multiplied by 0.15. Touch/pointer down pauses the timer; release resumes its remaining duration. Web cards use touchAction: none and overscrollBehavior: contain. The host uses box-none so surrounding content remains interactive.

Reduced-motion users get fade-only transitions. Errors use alert/assertive announcements; other notices use status/polite via React Native's role prop (the legacy accessibilityRole type has no status value). iOS additionally calls announceForAccessibility.

## Wired event matrix

All paths below are under mobile/src/design/. “Replaced” identifies previous dialog or inline success feedback; “New” identifies added transient feedback. An em dash means no message.

| Role | File and exact successful trigger | Variant | Final title | Final message | Change |
| --- | --- | --- | --- | --- | --- |
| Shared profile | [ProfileScreens.tsx](../src/design/ProfileScreens.tsx), profile save after user update/cache refresh | success | Profile updated | Your changes are saved. | Replaced notice dialog |
| Shared profile | ProfileScreens.tsx, password update resolves | success | Password updated | Use your new password next time you sign in. | Replaced notice dialog |
| Customer | ProfileScreens.tsx, checkout selects primary/saved address | info | Address selected | Using {address_type}. Fallback: Using your default address. / Using your saved address. | New |
| Shared profile | [ProfilePhotoControl.tsx](../src/design/ProfilePhotoControl.tsx), upload and photo refresh resolve | success | Photo updated | Your new photo is live. | Replaced inline success |
| Shared profile | ProfilePhotoControl.tsx, confirmed removal and refresh resolve | info | Photo removed | You can add a new one anytime. | Replaced inline success |
| Customer | [DeliverySchedule.tsx](../src/design/DeliverySchedule.tsx), validated pickup draft is saved | success | Pickup time set | {en-PH date and time} (PHT). | New |
| Shared contact UI | [CallContactButton.tsx](../src/design/CallContactButton.tsx), web clipboard helper returns true; contact panel closes | success | Number copied | {name}'s number is on your clipboard. Fallback: The number is on your clipboard. | Replaced inline success |
| All bell screens | [NotificationsScreen.tsx](../src/design/NotificationsScreen.tsx), confirmed single deletion and cache refresh resolve | info | Notification deleted | — | New |
| All bell screens | NotificationsScreen.tsx, confirmed read-list deletion and cache refresh resolve | info | Notifications cleared | Your read notifications are gone. | New |
| Shop | [ShopScreens.tsx](../src/design/ShopScreens.tsx), approved shop details save resolves | success | Shop details saved | Customers will see the update. | Replaced inline success |
| Shop | ShopScreens.tsx, new service save and cache refresh resolve; editor closes | success | Service added | {serviceName} is now on your menu. | New |
| Shop | ShopScreens.tsx, existing service save and cache refresh resolve; editor closes | success | Service updated | {serviceName} is saved. | New |
| Shop | ShopScreens.tsx, confirmed service delete and cache refresh resolve | info | Service deleted | {serviceName} was removed. | New |
| Shop | ShopScreens.tsx, kilo-price range save resolves; editor closes | success | Price range added | — | New |
| Shop | [ShopPhotoEditor.tsx](../src/design/ShopPhotoEditor.tsx), photo upload and refresh resolve | success | Shop photo updated | — | Replaced inline success |
| Shop | ShopPhotoEditor.tsx, confirmed photo removal and refresh resolve | info | Shop photo removed | — | Replaced inline success |
| Shop | [DeliveryScreens.tsx](../src/design/DeliveryScreens.tsx), saveWeight command succeeds | success | Weight saved | New total: {formatted total}. Omitted if refreshed weight is unavailable or does not match. | New |
| Shop | ShopScreens.tsx, initial shop application or rejected-application resubmission resolves | success | Application submitted | We'll review it and let you know. | New |
| Shop | [ShopRequirements.tsx](../src/design/ShopRequirements.tsx), document upload and refresh resolve | success | Document uploaded | {document label} is waiting for review. | Replaced inline success |
| Rider | [RiderAvailableJobs.tsx](../src/design/RiderAvailableJobs.tsx), availability update resolves; also DeliveryScreens.tsx rider dashboard toggle | success | You're online | You can now receive pickup and delivery jobs. | New |
| Rider | Same availability handlers, offline update resolves | info | You're offline | You won't get new jobs. | New |
| Rider | [RiderLocationSharing.tsx](../src/design/RiderLocationSharing.tsx), first location acknowledgement with sharedJobs > 0 after explicit start | info | Location sharing on | Customers can follow your delivery. | New |
| Rider | RiderLocationSharing.tsx, explicit stop handler disables sharing | info | Location sharing off | — | New |
| Rider | RiderAvailableJobs.tsx, claim request and refresh succeed before navigation | success | Job accepted | — | New |
| Rider | DeliveryScreens.tsx, assignment accept command succeeds | success | Job accepted | — | New |
| Rider | DeliveryScreens.tsx, assignment decline command succeeds | info | Job declined | — | New |
| Rider | DeliveryScreens.tsx, delivery action command succeeds; decision panel closes | success | Status updated | {resulting state/action label}. See labels below. | New |
| Rider | [RiderRequirementsScreens.tsx](../src/design/RiderRequirementsScreens.tsx), application submit and refresh resolve | success | Application submitted | We'll review it and let you know. | New |
| Rider | RiderRequirementsScreens.tsx, document upload and refresh resolve | success | Document uploaded | {document label} is waiting for review. | Replaced inline success |
| Admin | [ShopApprovalScreens.tsx](../src/design/ShopApprovalScreens.tsx), review save resolves, Approved from a non-suspended state | success | Shop approved | {shopName} can now accept orders. | New |
| Admin | ShopApprovalScreens.tsx, Rejected review resolves | warning | Shop rejected | {shopName}'s application was declined. | New |
| Admin | ShopApprovalScreens.tsx, Suspended review resolves | warning | Shop suspended | {shopName} can't take new orders. | New |
| Admin | ShopApprovalScreens.tsx, Approved review resolves for a previously suspended shop | success | Shop restored | {shopName} is active again. | New |
| Admin | DeliveryScreens.tsx, rider approval command succeeds; review closes | success | Rider approved | {riderName} can start taking jobs. | New |
| Admin | DeliveryScreens.tsx, rider rejection command succeeds; review closes | warning | Rider rejected | {riderName}'s application was declined. | New |
| Admin | DeliveryScreens.tsx, confirmed enable command succeeds | success | Rider enabled | {riderName}. | New |
| Admin | DeliveryScreens.tsx, confirmed disable command succeeds | warning | Rider disabled | {riderName}. | New |
| Admin | DeliveryScreens.tsx, assign/reassign command succeeds; assignment panel closes | success | Rider assigned | — | New |
| All roles | [data.ts](../src/design/data.ts), existing fail(error) call sites | error | Something went wrong | Existing normalized message(error). | Replaced error notice dialog |
| Signed-out login | [AuthScreens.tsx](../src/design/AuthScreens.tsx), login request catch | error | Couldn't sign in | Existing normalized message(error). | Replaced generic error notice dialog |
| All signed-in roles | [useNotificationToasts.ts](../src/design/useNotificationToasts.ts), unseen eligible foreground Notification row | info | Exact server title | Exact server message; action: View order | New |

Delivery labels are Pickup en route, Laundry picked up, At partner, Clean laundry collected, Out for delivery, Delivered, Arrival recorded, Handover confirmed, Pickup queued and Issue reported. Receiving a handoff uses its recorded kind: pickup → Laundry picked up; collection → Clean laundry collected; delivery → Completed. Every local label message ends with a period.

Copy adjustments: rider online includes pickup jobs; shop rejection does not claim a notification was sent; pickup dates explicitly use Philippine time; copy-number has a nameless fallback. Shop photo removal and rider document upload reuse the same established feedback pattern. Availability, hours and service areas share the shop-details save, so they produce one Shop details saved toast rather than separate duplicate notices.

## Feedback deliberately kept

- Logout, delete-account, order-cancel, service/photo/notification deletion, weight-save and other confirmation dialogs.
- Address, schedule, weight, document, profile, shop and other field validation; loading/empty/retry UI; workflow/status/timer panels.
- Registration, order-placement and account success pages. No additional login/logout/address-save/order-cancel success toast.
- Contact copy/dialer failure text with the visible number and recovery actions. A root toast would be less useful behind the contact modal.
- Upload failures and permission errors already shown beside the relevant action; location-sharing errors, paused states and settings guidance remain visible in their controls. No repeated background GPS toasts.
- Rider application Draft saved and admin document verification/correction notices remain beside their work, including inside review modals.
- No separate No connection, Upload failed or Session expired toast was added where a reliable distinct trigger was absent or existing feedback was sufficient. Existing fail(error) sites retain normalized network explanations.
- Checkout's embedded address picker already updates the visible review summary; the separate checkout address-selection screen gets Address selected.
- No invented payment/refund/voucher/recovery/2FA/tipping/rating/ETA events.

## Persisted notifications and dedupe

There is one 15-second notifications interval, owned by the root hook. The bell page and popover observe the same query key: ["notifications", userId, shopMode, audience]. Existing socket-driven cache invalidation stays unchanged.

Seen IDs are scoped by account and active role in memory. The first successful snapshot for each scope is a silent baseline. Auth changes/remounts reset tracking and dismiss old-account toasts. Read, previously seen and currently visible bell items stay silent. Opening a bell view also dismisses a matching displayed toast. The popover suppresses only its five displayed items.

AppState and document visibility disable foreground delivery and pause existing toast timers. Resuming explicitly refreshes the notification snapshot as a silent baseline before later foreground updates can toast.

Known order mutations are tracked before the request starts. While they are in flight, notification processing waits, which handles a socket refresh arriving before the HTTP response. On success, the next matching order notification above the previous ID watermark is suppressed for up to 30 seconds. Reassignment with a reason allows two records. Failed requests release the hold without suppressing an event. Coverage includes order creation, cancellation/status/timer actions, delivery actions, weight updates, claims, assignment/reassignment and rider offer responses. Request paths and bodies sent to the server are unchanged.

The schema has no actor ID, event type or client correlation ID. Consequently, an unrelated concurrent update to the same order could consume a suppression; a successful no-op could suppress the next same-order update; extra or very delayed local notifications, including additional audience rows after role switching, may still toast. These cannot be resolved exactly without server metadata. A pending request also briefly delays unrelated notifications until it finishes.

Customer links open transaction details, shop links open shop order details, admin links open admin order details, and rider links open jobs filtered by transactionId. Toast navigation does not mark a bell record read.

## Native modal stacking

AppDialogHost is subscribed to through the existing dialog service. Toast timers pause and cards hide while any queued dialog is open. They resume after the final dialog closes and its dismissal animation finishes. AppDialogHost itself was not rewritten.

A root host cannot draw above a separate native Modal window. As permitted by the request, other native panels are documented rather than mounting additional hosts. A toast can be hidden and expire while these remain open:

- CallContactButton contact fallback.
- DashboardAnalytics date filter.
- DeliveryScreens rider action, admin rider review and assignment panels.
- RiderDashboardPanel job details, tools and other rider dashboard panels.
- OrderScreens checkout editors and booking countdown.
- ProfileScreens birthdate picker; ProfilePhotoControl photo menu.
- RecentNotificationsModal bell popover (visible records are additionally suppressed).
- ShopScreens service/price editor; ShopApprovalScreens review panel.
- PickerField selection dialog.
- WeightEvidence enlarged scale photo; ShopRequirements enlarged document.
- MapboxMap and LaundryMap.native full-screen maps.

Success handlers generally close their editor/review/contact panel before showing feedback. Rider tools can remain open, so their toast may be behind the native panel; the existing availability/location status remains visible. Messenger/native modal behavior still needs device verification.

## Verification

- `npm run typecheck`: passed.
- `node --test --test-concurrency=2 tests/*.test.cjs`: 170 tests passed, including 13 toast/tracking/routing tests.
- Chrome at 390 × 844: slide/exit, upward dismissal, short-drag spring-back, downward resistance, no page scrolling during drag, touch pause/resume, automatic expiry, four-item eviction, keyed replacement, X, independent card/action callbacks, dialog queuing, all four role palettes and reduced-motion fade passed. Role screenshots were also visually reviewed.
- The reproducible browser check is `node tests/toast-browser.cjs` against a running Expo server; set `TOAST_TEST_URL` if it is not on port 8081. API requests are intercepted with fixtures. Screenshots are in the ignored `mobile/.expo/toast-check/` folder.
- `git diff --check`: passed.
- The browser checks used Expo's development web bundle. A production export and the broader optional production UI scenarios were not rerun. The existing contact-copy scenario was updated for the toast and automatic panel dismissal.

No lint script, ESLint configuration or installed ESLint executable exists in this project. Lint cannot honestly be reported as passing; no lint dependency was introduced.

Native Android/iOS interaction and screen-reader checks were not run: no device was attached. Messenger's embedded browser and real notch/safe-area behavior remain unverified. Desktop Chrome touch emulation is useful coverage but does not replace those checks.

The installed expo-router@57.0.25 package was missing declarations. Restoring that exact installed package enabled typechecking; package.json and lockfiles were not changed.

## Existing behavior not changed

Both HTTP 401 and 403 still log the user out in src/api/client.ts. Auth/session behavior, server notification text, API/socket payloads and database schema remain unchanged. Notification severity cannot be inferred reliably, so persisted records always use info.

The existing shop DashboardAnalytics SVG also emits a web development warning about the non-boolean accessible attribute. That unrelated component and its console behavior were left unchanged.
