-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "paid_by" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_payment" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT,
    "staff_name" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "period" TEXT NOT NULL,
    "paid_by" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_payment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "super_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payment" ADD CONSTRAINT "salary_payment_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payment" ADD CONSTRAINT "salary_payment_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "super_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
