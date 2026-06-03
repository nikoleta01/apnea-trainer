import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/sessions?month=2026-03
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month"); // e.g. "2026-03"

  const where: { userId: string; date?: { gte: Date; lt: Date } } = {
    userId: session.user.id,
  };

  if (month) {
    const [year, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(year, m - 1, 1),
      lt: new Date(year, m, 1),
    };
  }

  const sessions = await prisma.trainingSession.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return Response.json(sessions);
}

// POST /api/sessions
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, rounds, holdTime, breatheTime, completed } = body;

  if (!type) {
    return Response.json({ error: "type is required" }, { status: 400 });
  }

  const created = await prisma.trainingSession.create({
    data: {
      userId: session.user.id,
      date: new Date(),
      type,
      rounds: rounds ?? 0,
      holdTime: holdTime ?? 0,
      breatheTime: breatheTime ?? 0,
      completed: completed ?? false,
    },
  });

  return Response.json(created, { status: 201 });
}
