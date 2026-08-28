import type { ConfigType } from "@/features/generator/domain/types";

/**
 * Placeholder content for the community shell. No backend exists yet — this
 * file is the seam where the feed query will replace the mock.
 */
export type CommunityPost = {
  id: string;
  title: string;
  summary: string;
  author: string;
  authorRank: string;
  configType: ConfigType;
  tags: string[];
  likes: number;
  downloads: number;
  comments: number;
  postedAt: string;
};

export const communityFilters = ["Neu", "Beliebt", "Pro-Setups", "Practice", "Server"] as const;

export const mockPosts: CommunityPost[] = [
  {
    id: "post-1",
    title: "Faceit-Level-10 Autoexec 2026",
    summary: "Statisches Crosshair, 400 fps cap, kompaktes HUD und ein Radar, das die ganze Map zeigt. Läuft seit zwei Seasons unverändert.",
    author: "niko_b",
    authorRank: "Level 10",
    configType: "matchmaking",
    tags: ["crosshair", "radar", "performance"],
    likes: 1284,
    downloads: 4102,
    comments: 96,
    postedAt: "vor 2 Stunden",
  },
  {
    id: "post-2",
    title: "Practice-Setup für Smoke-Lineups",
    summary: "Flugbahnen, Einschläge, unendliche Granaten und ein Bind-Set, mit dem du Lineups in Sekunden zurücksetzt.",
    author: "lineupqueen",
    authorRank: "Coach",
    configType: "practice",
    tags: ["lineups", "binds", "noclip"],
    likes: 863,
    downloads: 2571,
    comments: 41,
    postedAt: "vor 5 Stunden",
  },
  {
    id: "post-3",
    title: "5v5 Match-Server nach ESL-Regeln",
    summary: "Economy, Freezetime, Overtime und Admin-Regeln exakt am aktuellen ESL-Regelwerk. Direkt auf den Server kopierbar.",
    author: "srv_admin",
    authorRank: "Verifiziert",
    configType: "server",
    tags: ["esl", "overtime", "economy"],
    likes: 654,
    downloads: 1893,
    comments: 28,
    postedAt: "gestern",
  },
  {
    id: "post-4",
    title: "Launch Options für Low-End-PCs",
    summary: "Startparameter, die auf älteren Rechnern messbar Frames bringen — ohne Tricks, die dich in Ranked bannen können.",
    author: "fpsdoktor",
    authorRank: "Level 8",
    configType: "launch-options",
    tags: ["fps", "low-end"],
    likes: 512,
    downloads: 2210,
    comments: 63,
    postedAt: "vor 2 Tagen",
  },
  {
    id: "post-5",
    title: "Warmup mit 5 Minuten Aim-Routine",
    summary: "Warmup-Timer, Bot-Setup und eine feste Routine, die du vor jedem Match durchziehst.",
    author: "aimlab_andi",
    authorRank: "Level 9",
    configType: "warmup",
    tags: ["aim", "routine"],
    likes: 337,
    downloads: 908,
    comments: 12,
    postedAt: "vor 3 Tagen",
  },
  {
    id: "post-6",
    title: "Offline-Bots für Retake-Training",
    summary: "Rundenregeln, Bot-Schwierigkeit und Economy so gesetzt, dass jede Runde ein Retake ist.",
    author: "retakegod",
    authorRank: "Level 10",
    configType: "offline",
    tags: ["retake", "bots"],
    likes: 289,
    downloads: 774,
    comments: 19,
    postedAt: "vor 4 Tagen",
  },
];
