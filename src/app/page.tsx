import { auth } from "@/auth";
import { GeneratorApp } from "@/features/generator/components/generator-app";

export default async function Home() {
  const session = await auth();
  return (
    <GeneratorApp
      user={session?.user ?? null}
      authProviders={{
        discord: Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET),
        steam: Boolean(process.env.STEAM_WEB_API_KEY),
      }}
    />
  );
}
