-- Drop FKs we need to modify
ALTER TABLE "app_user" DROP CONSTRAINT "app_user_branch_id_fkey";
ALTER TABLE "fund_source" DROP CONSTRAINT "fund_source_partner_id_fkey";
ALTER TABLE "partner_distribution" DROP CONSTRAINT "partner_distribution_partner_id_fkey";

-- Create the new partner table
CREATE TABLE "partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "partner" ADD CONSTRAINT "partner_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "super_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Copy existing partner-role app_user rows into partner, keeping the same id
INSERT INTO "partner" ("id", "name", "email", "phone", "createdById", "createdAt")
SELECT "id", "name", "email", "phone", NULL, "created_at"
FROM "app_user"
WHERE "role" = 'PARTNER';

-- Repoint FKs to the new partner table (safe now — partner rows exist)
ALTER TABLE "fund_source" ADD CONSTRAINT "fund_source_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_distribution" ADD CONSTRAINT "partner_distribution_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove old partner rows from app_user now that FKs point elsewhere
DELETE FROM "app_user" WHERE "role" = 'PARTNER';

-- Clean up PARTNER from role tables
DELETE FROM "role_permission" WHERE "role" = 'PARTNER';
DELETE FROM "Role" WHERE "name" = 'PARTNER';

-- Now safe: tighten branch_id and restore its FK
ALTER TABLE "app_user" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;