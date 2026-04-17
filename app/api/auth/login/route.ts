import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = getUserByEmail(email.toLowerCase());
    if (!user) {
      // Constant-time response to prevent user enumeration
      await new Promise((r) => setTimeout(r, 200));
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signToken({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    await setSessionCookie(token);

    return NextResponse.json({ ok: true, username: user.username });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
