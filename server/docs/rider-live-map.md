Rider and shop trip maps
=======================

An accepted job in My Jobs shows Your trip map using the shared Mapbox-tile map component on web and native. Start sharing location at the top of My Jobs to publish the rider marker. Customer and shop markers are displayed from the order's saved coordinates. The shop sees Assigned rider location in the pickup/return step of its order details; the customer retains Track your rider.

GET `/api/delivery/orders/:id/tracking` authorizes only that order's customer, shop owner, admins and currently accepted rider. Other shops, unrelated accounts, and previously assigned/completed riders cannot read the live position. No public tracking link is created. API responses remain private/no-store and do not expose location session identifiers. A map resource access error after completion/reassignment stays local to the map and does not clear the rider's account session.

The rider chooses Start sharing location / Stop sharing location. Publication applies only to their accepted assignments in travelling stages. The backend rejects old/future readings, prevents older samples replacing newer ones, and scopes stop requests to their sharing session. The provider samples foreground GPS and publishes at most every ten seconds, with a fifteen-second sampling fallback; viewers refresh about every five seconds. A forty-five-second-old point is shown as stale. Switching apps or locking the screen pauses sharing; completion/cancellation/reassignment clears location through the existing workflow.

Pins are reported positions, not road directions or ETA calculations. Mapbox tiles use the existing public token. No new database migration or location permissions beyond the existing foreground permission are required.
