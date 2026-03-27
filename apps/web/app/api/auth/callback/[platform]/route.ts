import { NextRequest, NextResponse } from "next/server";
import { db } from "@hook/db";
import { connectedAccounts } from "@hook/db/schema";
import { encryptToken } from "@hook/db/crypto";
import { requireAuth } from "@/lib/session";
import { eq, and } from "drizzle-orm";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!;

// X OAuth 2.0 PKCE token exchange
async function exchangeXCode(
  code: string,
  codeVerifier: string
): Promise<{ accessToken: string; userId: string; handle: string; name: string }> {
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.X_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/x`,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`X token exchange failed: ${await res.text()}`);
  const tokens = await res.json() as { access_token: string };

  // Fetch user info
  const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json() as { data: { id: string; username: string; name: string; profile_image_url?: string } };

  return {
    accessToken: tokens.access_token,
    userId: user.data.id,
    handle: `@${user.data.username}`,
    name: user.data.name,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  let user: Awaited<ReturnType<typeof requireAuth>>["user"];
  try {
    ({ user } = await requireAuth());
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?error=${error ?? "oauth_failed"}`, req.url)
    );
  }

  try {
    if (platform === "x") {
      const { Cookie: cookieHeader } = Object.fromEntries(req.headers.entries());
      const cookies = Object.fromEntries(
        (cookieHeader ?? "").split("; ").map((c) => c.split("=") as [string, string])
      );
      const storedState = cookies.x_oauth_state;
      const codeVerifier = cookies.x_code_verifier;

      if (!state || state !== storedState || !codeVerifier) {
        return NextResponse.redirect(new URL("/settings?error=invalid_state", req.url));
      }

      const { accessToken, userId, handle, name } = await exchangeXCode(code, codeVerifier);
      const encryptedAccessToken = encryptToken(accessToken, ENCRYPTION_KEY);

      // Upsert connected account
      const existing = await db
        .select()
        .from(connectedAccounts)
        .where(
          and(
            eq(connectedAccounts.creatorId, user.id),
            eq(connectedAccounts.platform, "x")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(connectedAccounts)
          .set({
            encryptedAccessToken,
            platformAccountId: userId,
            handle,
            displayName: name,
            authStatus: "active",
          })
          .where(eq(connectedAccounts.id, existing[0].id));
      } else {
        await db.insert(connectedAccounts).values({
          creatorId: user.id,
          platform: "x",
          platformAccountId: userId,
          handle,
          displayName: name,
          encryptedAccessToken,
          scopes: ["tweet.read", "tweet.write", "users.read"],
        });
      }
    }

    return NextResponse.redirect(new URL("/settings?connected=1", req.url));
  } catch (err) {
    console.error(`[oauth/callback/${platform}]`, err);
    return NextResponse.redirect(new URL("/settings?error=connection_failed", req.url));
  }
}
