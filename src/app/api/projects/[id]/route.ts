import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { stepFiles: { orderBy: { step: "asc" } } },
  });

  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  if (project.userId !== user.id) {
    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  return NextResponse.json({ project });
}
