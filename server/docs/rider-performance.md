Rider dashboard performance
===========================

GET `/api/delivery/rider/performance` requires an authenticated rider account and reads only that rider's assignments. It returns rolling 30-day outcomes and Philippine-calendar daily buckets for the latest seven days. Pickup and delivery are separate jobs. Completion rate is Completed / (Completed + Failed); declined, expired, cancelled and reassigned offers are excluded. Active assignments are counted separately, including older active jobs.

Trip durations use `accepted_at` and `completed_at` for new job transitions. For historical assignments the service can recover start/end timestamps from the assigned rider's matching workflow events inside the assignment window. Missing, negative or future durations are excluded, with null averages and explicit sample counts. GPS updates never determine trip duration. Historical completion dates fall back to the terminal assignment's last-updated timestamp when no completion event exists.

Handover photos
===============

- PUT `/api/delivery/assignments/:id/photos`: assigned active rider; an Accepted or Completed assignment. Body: `kind`, optional `note` up to 500 characters, `imageBase64`. Pickup kinds: CustomerPickup / ShopDropoff. Delivery kinds: ShopCollection / CustomerDelivery.
- GET `/api/delivery/orders/:id/handover-photos`: metadata only.
- GET `/api/delivery/orders/:id/handover-photos/:photoId`: authenticated private JPEG response, never a public image URL.

The customer, shop owner, admins, and riders holding an Accepted/Completed assignment on the order may view evidence. Unrelated accounts and unaccepted offers cannot view images. Uploads recheck assignment ownership/status under order/assignment locks and permit at most three photos of each kind per assignment. Each photo records its uploader, assignment, workflow status and server timestamp. The existing image decoder validates JPEG/PNG/WebP input up to 6 MB, re-encodes to JPEG, resizes oversized images, and discards EXIF metadata. New rows use the backend's protected database access; RLS is enabled.

Photos support the handover record; uploading does not advance the order or bypass existing physical handover confirmation. Riders attach/view photos in My jobs and History; customers and shops view them under Laundry handover photos in order details. No existing orders, assignment states or photos are rewritten by the migration.

Deployment
==========

Apply `20261104020000_rider_performance_photos`, generate Prisma Client, build and deploy the backend, then deploy/reload the frontend. Both API endpoints must be served by the frontend's configured backend; the current app configuration points to Render. Backend regression tests mock data and image processing, and never upload real order photos.
