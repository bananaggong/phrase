import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: { stepFiles: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ projectId: project.id }, { status: 201 });
}
