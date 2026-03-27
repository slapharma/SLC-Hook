import { NextRequest, NextResponse } from "next/server";
import { db } from "@hook/db";
import { creators } from "@hook/db/schema";
import { lucia } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.email, email))
    .limit(1);

  if (!creator || !creator.hashedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, creator.hashedPassword);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await lucia.createSession(creator.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

  return NextResponse.json({ userId: creator.id });
}
