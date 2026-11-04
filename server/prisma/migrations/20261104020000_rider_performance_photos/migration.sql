BEGIN;
ALTER TABLE "delivery_assignments" ADD COLUMN "accepted_at" TIMESTAMP(3), ADD COLUMN "completed_at" TIMESTAMP(3);
CREATE TABLE "rider_handover_photos" (
  "id" SERIAL PRIMARY KEY,
  "transaction_id" INTEGER NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "assignment_id" INTEGER NOT NULL REFERENCES "delivery_assignments"("id") ON DELETE CASCADE,
  "rider_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('CustomerPickup','ShopDropoff','ShopCollection','CustomerDelivery')),
  "note" TEXT NOT NULL DEFAULT '',
  "workflow_status" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "rider_handover_photos_transaction_id_created_at_idx" ON "rider_handover_photos"("transaction_id", "created_at");
CREATE INDEX "rider_handover_photos_assignment_id_kind_idx" ON "rider_handover_photos"("assignment_id", "kind");
ALTER TABLE "rider_handover_photos" ENABLE ROW LEVEL SECURITY;
COMMIT;
