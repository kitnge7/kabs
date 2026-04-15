import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
} from "@/lib/db";
import {
  hashPassword,
  signToken,
  setSessionCookie,
  validateEmail,
  validateUsername,
  validatePassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, username, password } = body as {
      email?: string;
      username?: string;
      password?: string;
    };

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Email, username, and password are required" },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!validateUsername(username)) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters (letters, numbers, _ or -)" },
        { status: 400 }
      );
    }

    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      return NextResponse.json({ error: pwResult.message }, { status: 400 });
    }

    const existingEmail = getUserByEmail(email.toLowerCase());
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const existingUsername = getUserByUsername(username.toLowerCase());
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(password);
    createUser(id, email.toLowerCase(), username.toLowerCase(), passwordHash);

    const token = await signToken({
      sub: id,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
    });

    await setSessionCookie(token);

    return NextResponse.json({ ok: true, username: username.toLowerCase() });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
