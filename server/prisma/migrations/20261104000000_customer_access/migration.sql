ALTER TABLE "users"
  ADD COLUMN "is_blocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "block_reason" TEXT,
  ADD COLUMN "blocked_at" TIMESTAMP(3),
  ADD COLUMN "access_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "customer_access_reviews" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER,
  "actor_id" INTEGER,
  "blocked" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_access_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_access_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "customer_access_reviews_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "customer_access_reviews_user_id_created_at_idx" ON "customer_access_reviews"("user_id", "created_at");
