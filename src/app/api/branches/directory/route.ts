import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/branches/directory — active branches, minimal fields (staff or super admin)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const branches = await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, location: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ branches });
}
