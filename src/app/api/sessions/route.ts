import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sessions?userId=...&month=2026-03
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const month = searchParams.get("month"); // e.g. "2026-03"

  const where: { userId: string; date?: { gte: Date; lt: Date } } = { userId };

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
  const body = await request.json();
  const { userId, type, rounds, holdTime, breatheTime, completed } = body;

  if (!userId || !type) {
    return Response.json(
      { error: "userId and type are required" },
      { status: 400 }
    );
  }

  const session = await prisma.trainingSession.create({
    data: {
      userId,
      date: new Date(),
      type,
      rounds: rounds ?? 0,
      holdTime: holdTime ?? 0,
      breatheTime: breatheTime ?? 0,
      completed: completed ?? false,
    },
  });

  return Response.json(session, { status: 201 });
}
