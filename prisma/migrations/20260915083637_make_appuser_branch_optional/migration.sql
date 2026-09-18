-- DropForeignKey
ALTER TABLE "app_user" DROP CONSTRAINT "app_user_branch_id_fkey";

-- AlterTable
ALTER TABLE "app_user" ALTER COLUMN "branch_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
