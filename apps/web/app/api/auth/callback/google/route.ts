import { NextRequest, NextResponse } from "next/server";
import { google } from "@/lib/google";
import { lucia } from "@/lib/auth";
import { db } from "@hook/db";
import { creators, oauthAccounts } from "@hook/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";

interface GoogleClaims {
  sub: string;
  email: string;
  name: string;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  const codeVerifier = cookieStore.get("google_code_verifier")?.value;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;

  // Upsert creator
  let [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.email, claims.email))
    .limit(1);

  if (!creator) {
    [creator] = await db
      .insert(creators)
      .values({ email: claims.email, name: claims.name })
      .returning();
  }

  // Upsert oauth account link
  const existingOauth = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.providerId, "google"),
        eq(oauthAccounts.providerUserId, claims.sub)
      )
    )
    .limit(1);

  if (existingOauth.length === 0) {
    await db
      .insert(oauthAccounts)
      .values({ providerId: "google", providerUserId: claims.sub, userId: creator.id });
  }

  const session = await lucia.createSession(creator.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
