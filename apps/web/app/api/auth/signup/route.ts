import { NextRequest, NextResponse } from "next/server";
import { db } from "@hook/db";
import { creators } from "@hook/db/schema";
import { lucia } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  const existing = await db
    .select()
    .from(creators)
    .where(eq(creators.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashedPassword = await hashPassword(password);
  const [creator] = await db
    .insert(creators)
    .values({ email, hashedPassword, name })
    .returning();

  const session = await lucia.createSession(creator.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

  return NextResponse.json({ userId: creator.id }, { status: 201 });
}
