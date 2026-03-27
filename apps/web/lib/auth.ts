import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@hook/db";
import { sessions, creators } from "@hook/db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, creators);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes(attributes) {
    return {
      id: attributes.id,
      email: attributes.email,
      name: attributes.name,
      subscriptionTier: attributes.subscriptionTier,
      onboardingCompletedAt: attributes.onboardingCompletedAt,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      id: string;
      email: string;
      name: string;
      subscriptionTier: "free" | "creator" | "pro";
      onboardingCompletedAt: Date | null;
    };
  }
}
