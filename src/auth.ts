import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord, { type DiscordProfile } from "next-auth/providers/discord";
import { z } from "zod";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { getAuthSecret } from "@/features/auth/server/auth-secret";
import { findSteamUser } from "@/features/auth/server/steam-account";
import { verifySteamLoginToken } from "@/features/auth/server/steam-openid";

const credentialsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const steamCredentialsSchema = z.object({
  steamId: z.string().regex(/^\d{17}$/),
  loginToken: z.string().min(1).max(1_024),
});

function mapDiscordProfile(profile: DiscordProfile) {
  const defaultAvatarNumber = profile.discriminator === "0"
    ? Number(BigInt(profile.id) >> BigInt(22)) % 6
    : Number.parseInt(profile.discriminator, 10) % 5;
  const image = profile.avatar === null
    ? `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
    : `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith("a_") ? "gif" : "png"}`;

  return {
    id: profile.id,
    name: profile.global_name ?? profile.username,
    // Automatisches Verknüpfen per E-Mail ist nur sicher, wenn Discord die
    // Adresse selbst als verifiziert ausweist.
    email: profile.verified ? profile.email : null,
    image,
  };
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "E-Mail", type: "email" },
      password: { label: "Passwort", type: "password" },
    },
    authorize: async (credentials) => {
      const result = credentialsSchema.safeParse(credentials);
      if (!result.success) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, result.data.email))
        .limit(1);

      if (!user?.passwordHash) return null;
      const valid = await compare(result.data.password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
  Credentials({
    id: "steam",
    name: "Steam",
    credentials: {
      steamId: { type: "text" },
      loginToken: { type: "text" },
    },
    authorize: async (credentials) => {
      const result = steamCredentialsSchema.safeParse(credentials);
      if (!result.success || !verifySteamLoginToken(
        result.data.loginToken,
        result.data.steamId,
        getAuthSecret(),
      )) return null;

      return findSteamUser(result.data.steamId);
    },
  }),
];

if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
  providers.push(Discord({
    clientId: process.env.AUTH_DISCORD_ID,
    clientSecret: process.env.AUTH_DISCORD_SECRET,
    allowDangerousEmailAccountLinking: true,
    profile: mapDiscordProfile,
  }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getAuthSecret(),
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.userId as string;
      return session;
    },
  },
});
