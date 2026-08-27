import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

// DELETE /api/roles/:roleId — only allowed for non-system roles with zero staff assigned
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { roleId } = await params;

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (role.isSystem) {
    return NextResponse.json({ error: "Built-in roles cannot be deleted" }, { status: 400 });
  }

  const staffCount = await prisma.appUser.count({ where: { role: role.name } });
  if (staffCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${staffCount} staff member(s) currently have this role. Reassign them first.` },
      { status: 400 }
    );
  }

  await prisma.rolePermission.deleteMany({ where: { role: role.name } });
  await prisma.role.delete({ where: { id: roleId } });

  await prisma.auditLog.create({
    data: {
      entityType: "ROLE",
      entityId: roleId,
      action: "DELETED",
      performedByAdminId: auth.id,
      metadata: { name: role.name },
    },
  });

  return NextResponse.json({ success: true });
}