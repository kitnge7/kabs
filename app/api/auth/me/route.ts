import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const user = getUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.created_at,
  });
}
