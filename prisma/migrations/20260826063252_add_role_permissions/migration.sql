-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_permission_key_key" ON "role_permission"("role", "permission_key");
