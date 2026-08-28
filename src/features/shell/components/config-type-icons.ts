import { Bot, Crosshair, Flame, Server, Target, Terminal, type LucideIcon } from "lucide-react";
import type { ConfigType } from "@/features/generator/domain/types";

export const configTypeIcons: Record<ConfigType, LucideIcon> = {
  matchmaking: Crosshair,
  practice: Target,
  server: Server,
  offline: Bot,
  warmup: Flame,
  "launch-options": Terminal,
};
