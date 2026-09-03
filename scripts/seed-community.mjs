import { createHash } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const now = Date.now();
const hoursAgo = (hours) => new Date(now - hours * 60 * 60 * 1_000);
const daysAgo = (days) => hoursAgo(days * 24);

const users = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Nova",
    email: "demo+nova@unbindall.local",
    handle: "demo_nova",
    displayName: "Nova",
    createdAt: daysAgo(120),
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Taktikfuchs",
    email: "demo+taktikfuchs@unbindall.local",
    handle: "demo_taktikfuchs",
    displayName: "Taktikfuchs",
    createdAt: daysAgo(95),
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Nadebook",
    email: "demo+nadebook@unbindall.local",
    handle: "demo_nadebook",
    displayName: "Nadebook",
    createdAt: daysAgo(82),
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    name: "Cozy Frag",
    email: "demo+cozyfrag@unbindall.local",
    handle: "demo_cozyfrag",
    displayName: "Cozy Frag",
    createdAt: daysAgo(64),
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    name: "Server Ops",
    email: "demo+serverops@unbindall.local",
    handle: "demo_serverops",
    displayName: "Server Ops",
    createdAt: daysAgo(180),
  },
  {
    id: "00000000-0000-4000-8000-000000000106",
    name: "Pixel Peek",
    email: "demo+pixelpeek@unbindall.local",
    handle: "demo_pixelpeek",
    displayName: "Pixel Peek",
    createdAt: daysAgo(51),
  },
];

function document(configType, values, options = {}) {
  const commandValues = {};
  for (const [name, value] of Object.entries(values)) {
    commandValues[name] = value;
    commandValues[`enabled:${name}`] = true;
  }

  return {
    schemaVersion: 3,
    configType,
    commandValues,
    standardBinds: options.standardBinds ?? [],
    multiBinds: options.multiBinds ?? [],
    customBinds: options.customBinds ?? [],
    importedFiles: [],
  };
}

function publishedFile(name, configType, values, rawConfig, options) {
  return {
    name,
    configType,
    document: document(configType, values, options),
    rawConfig,
  };
}

const movementBinds = [
  { actionId: "forward", key: "w", enabled: true },
  { actionId: "back", key: "s", enabled: true },
  { actionId: "left", key: "a", enabled: true },
  { actionId: "right", key: "d", enabled: true },
  { actionId: "jump", key: "mwheeldown", enabled: true },
  { actionId: "duck", key: "ctrl", enabled: true },
  { actionId: "voice", key: "mouse4", enabled: true },
];

const posts = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    versionId: "00000000-0000-4000-8000-000000000301",
    authorId: users[0].id,
    kind: "config",
    slug: "faceit-ready-autoexec-demo01",
    title: "FACEIT-ready Autoexec",
    summary: "Ruhiges grünes Crosshair, weites Radar, klares Audio und praktische Standard-Binds für Premier und FACEIT.",
    tags: ["competitive", "faceit", "crosshair", "radar"],
    publishedAt: hoursAgo(3),
    files: [publishedFile(
      "autoexec.cfg",
      "matchmaking",
      {
        sensitivity: 1.18,
        zoom_sensitivity_ratio: 1,
        cl_crosshairstyle: 4,
        cl_crosshairsize: 2,
        cl_crosshairgap: -2.5,
        cl_crosshairthickness: 0.5,
        cl_crosshaircolor: 1,
        cl_radar_always_centered: false,
        cl_radar_scale: 0.38,
        snd_voipvolume: 0.62,
        fps_max: 400,
      },
      [
        "sensitivity 1.18",
        "zoom_sensitivity_ratio 1",
        "cl_crosshairstyle 4",
        "cl_crosshairsize 2",
        "cl_crosshairgap -2.5",
        "cl_crosshairthickness 0.5",
        "cl_crosshaircolor 1",
        "cl_radar_always_centered 0",
        "cl_radar_scale 0.38",
        "snd_voipvolume 0.62",
        "fps_max 400",
      ].join("\n"),
      {
        standardBinds: movementBinds,
        multiBinds: [{
          id: "demo-smoke-multi",
          label: "Smoke schnell ziehen",
          actionId: "smoke",
          keys: ["x", "mouse5"],
          enabled: true,
        }],
      },
    )],
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    versionId: "00000000-0000-4000-8000-000000000302",
    authorId: users[2].id,
    kind: "config",
    slug: "mirage-grenade-lab-demo02",
    title: "Mirage Grenade Lab",
    summary: "Offline-Practice mit unendlicher Munition, Flugbahn-Vorschau, Impacts und schnellem Neustart für Lineup-Sessions.",
    tags: ["practice", "mirage", "grenades", "lineups"],
    publishedAt: hoursAgo(10),
    files: [publishedFile(
      "practice.cfg",
      "practice",
      {
        sv_cheats: true,
        sv_infinite_ammo: 1,
        ammo_grenade_limit_total: 6,
        mp_buy_anywhere: 1,
        mp_buytime: 9999,
        mp_freezetime: 0,
        mp_roundtime_defuse: 60,
        sv_grenade_trajectory_prac_pipreview: true,
        sv_showimpacts: 1,
        sv_showimpacts_time: 4,
        bot_kick: true,
      },
      [
        "sv_cheats 1",
        "sv_infinite_ammo 1",
        "ammo_grenade_limit_total 6",
        "mp_buy_anywhere 1",
        "mp_buytime 9999",
        "mp_freezetime 0",
        "mp_roundtime_defuse 60",
        "sv_grenade_trajectory_prac_pipreview 1",
        "sv_showimpacts 1",
        "sv_showimpacts_time 4",
        "bot_kick",
      ].join("\n"),
    )],
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    versionId: "00000000-0000-4000-8000-000000000303",
    authorId: users[4].id,
    kind: "project",
    slug: "mr12-scrim-pack-demo03",
    title: "MR12 Scrim Pack",
    summary: "Komplettes Paket für Team-Scrims: Competitive-Server, fünf Minuten Warmup und eine schlanke Spieler-Config.",
    tags: ["server", "scrim", "mr12", "team"],
    publishedAt: daysAgo(2),
    files: [
      publishedFile(
        "server.cfg",
        "server",
        {
          mp_maxrounds: 24,
          mp_overtime_enable: true,
          mp_overtime_maxrounds: 6,
          mp_overtime_startmoney: 10000,
          mp_startmoney: 800,
          mp_freezetime: 15,
          mp_buytime: 20,
          mp_c4timer: 40,
          mp_team_timeout_max: 4,
          sv_pausable: true,
        },
        [
          "mp_maxrounds 24",
          "mp_overtime_enable 1",
          "mp_overtime_maxrounds 6",
          "mp_overtime_startmoney 10000",
          "mp_startmoney 800",
          "mp_freezetime 15",
          "mp_buytime 20",
          "mp_c4timer 40",
          "mp_team_timeout_max 4",
          "sv_pausable 1",
        ].join("\n"),
      ),
      publishedFile(
        "warmup.cfg",
        "warmup",
        { mp_warmuptime: 300, mp_warmup_pausetimer: false },
        "mp_warmuptime 300\nmp_warmup_pausetimer 0",
      ),
      publishedFile(
        "team-autoexec.cfg",
        "matchmaking",
        { cl_radar_scale: 0.4, cl_teamid_overhead_mode: 2, fps_max: 400 },
        "cl_radar_scale 0.4\ncl_teamid_overhead_mode 2\nfps_max 400",
        { standardBinds: movementBinds },
      ),
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    versionId: "00000000-0000-4000-8000-000000000304",
    authorId: users[3].id,
    kind: "config",
    slug: "quiet-clutch-audio-demo04",
    title: "Quiet Clutch Audio",
    summary: "Reduzierte Musik, verständlicher Voice-Chat und ein neutrales Kopfhörerprofil, damit wichtige Schritte im Mix bleiben.",
    tags: ["audio", "competitive", "headphones"],
    publishedAt: daysAgo(4),
    files: [publishedFile(
      "audio.cfg",
      "matchmaking",
      {
        volume: 0.55,
        snd_voipvolume: 0.68,
        voice_modenable: true,
        snd_headphone_eq: 0,
        snd_menumusic_volume: 0,
        snd_roundstart_volume: 0,
        snd_roundend_volume: 0.06,
        snd_mvp_volume: 0,
        snd_tensecondwarning_volume: 0.2,
      },
      [
        "volume 0.55",
        "snd_voipvolume 0.68",
        "voice_modenable 1",
        "snd_headphone_eq 0",
        "snd_menumusic_volume 0",
        "snd_roundstart_volume 0",
        "snd_roundend_volume 0.06",
        "snd_mvp_volume 0",
        "snd_tensecondwarning_volume 0.2",
      ].join("\n"),
    )],
  },
  {
    id: "00000000-0000-4000-8000-000000000205",
    versionId: "00000000-0000-4000-8000-000000000305",
    authorId: users[5].id,
    kind: "config",
    slug: "twenty-minute-warmup-demo05",
    title: "20-Minuten Aim-Warmup",
    summary: "Schnelles Offline-Warmup mit Respawn, langer Aufwärmphase und klaren Impacts für die tägliche Aim-Routine.",
    tags: ["warmup", "aim", "routine"],
    publishedAt: daysAgo(1),
    files: [publishedFile(
      "warmup.cfg",
      "offline",
      {
        mp_warmuptime: 1200,
        mp_warmup_pausetimer: false,
        mp_respawn_on_death_ct: true,
        mp_respawn_on_death_t: true,
        mp_respawn_immunitytime: 0,
        sv_showimpacts: 1,
        sv_showimpacts_time: 2,
      },
      [
        "mp_warmuptime 1200",
        "mp_warmup_pausetimer 0",
        "mp_respawn_on_death_ct 1",
        "mp_respawn_on_death_t 1",
        "mp_respawn_immunitytime 0",
        "sv_showimpacts 1",
        "sv_showimpacts_time 2",
      ].join("\n"),
    )],
  },
  {
    id: "00000000-0000-4000-8000-000000000206",
    versionId: "00000000-0000-4000-8000-000000000306",
    authorId: users[1].id,
    kind: "project",
    slug: "lan-ready-team-bundle-demo06",
    title: "LAN-ready Team Bundle",
    summary: "Ein reproduzierbares Basisprojekt für Turniertage mit Autoexec, Serverregeln und festen Launch Options.",
    tags: ["lan", "team", "project", "stable"],
    publishedAt: daysAgo(7),
    files: [
      publishedFile(
        "autoexec.cfg",
        "matchmaking",
        { fps_max: 400, cl_radar_scale: 0.42, cl_hud_radar_scale: 1.05 },
        "fps_max 400\ncl_radar_scale 0.42\ncl_hud_radar_scale 1.05",
        { standardBinds: movementBinds },
      ),
      publishedFile(
        "server.cfg",
        "server",
        { mp_maxrounds: 24, mp_overtime_enable: true, mp_freezetime: 15, mp_c4timer: 40 },
        "mp_maxrounds 24\nmp_overtime_enable 1\nmp_freezetime 15\nmp_c4timer 40",
      ),
      publishedFile(
        "launch-options.txt",
        "launch-options",
        { launch_console: true, launch_display_mode: "fullscreen" },
        "-console -fullscreen",
      ),
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000207",
    versionId: "00000000-0000-4000-8000-000000000307",
    authorId: users[0].id,
    kind: "config",
    slug: "tiny-cyan-crosshair-demo07",
    title: "Tiny Cyan Crosshair",
    summary: "Kleines statisches Cyan-Crosshair ohne Kontur für Spieler, die eine freie Sicht auf den Kopf bevorzugen.",
    tags: ["crosshair", "minimal", "cyan"],
    publishedAt: hoursAgo(28),
    files: [publishedFile(
      "crosshair.cfg",
      "matchmaking",
      {
        cl_crosshairstyle: 4,
        cl_crosshairsize: 1.5,
        cl_crosshairgap: -3,
        cl_crosshairthickness: 0.5,
        cl_crosshairdot: false,
        cl_crosshaircolor: 4,
        cl_crosshair_drawoutline: false,
      },
      [
        "cl_crosshairstyle 4",
        "cl_crosshairsize 1.5",
        "cl_crosshairgap -3",
        "cl_crosshairthickness 0.5",
        "cl_crosshairdot 0",
        "cl_crosshaircolor 4",
        "cl_crosshair_drawoutline 0",
      ].join("\n"),
    )],
  },
];

const comments = [
  {
    id: "00000000-0000-4000-8000-000000000401",
    postId: posts[0].id,
    authorId: users[1].id,
    parentId: null,
    body: "Das Radar fühlt sich auf Ancient richtig gut an. Danke fürs Teilen!",
    createdAt: hoursAgo(2.5),
  },
  {
    id: "00000000-0000-4000-8000-000000000402",
    postId: posts[0].id,
    authorId: users[0].id,
    parentId: "00000000-0000-4000-8000-000000000401",
    body: "Freut mich! Für Nuke nehme ich manchmal 0.42 statt 0.38.",
    createdAt: hoursAgo(2),
  },
  {
    id: "00000000-0000-4000-8000-000000000403",
    postId: posts[1].id,
    authorId: users[3].id,
    parentId: null,
    body: "Perfekt für eine kurze Lineup-Runde vor dem Match.",
    createdAt: hoursAgo(8),
  },
  {
    id: "00000000-0000-4000-8000-000000000404",
    postId: posts[2].id,
    authorId: users[1].id,
    parentId: null,
    body: "Die Timeout-Werte passen direkt für unsere Scrims.",
    createdAt: hoursAgo(30),
  },
  {
    id: "00000000-0000-4000-8000-000000000405",
    postId: posts[4].id,
    authorId: users[2].id,
    parentId: null,
    body: "Schöne kompakte Routine, besonders mit zwei Spielern auf einer Aim-Map.",
    createdAt: hoursAgo(20),
  },
];

const reactions = [
  [posts[0], users[1]], [posts[0], users[2]], [posts[0], users[3]], [posts[0], users[5]],
  [posts[1], users[0]], [posts[1], users[1]], [posts[1], users[3]],
  [posts[2], users[0]], [posts[2], users[1]], [posts[2], users[2]], [posts[2], users[3]],
  [posts[3], users[0]], [posts[3], users[5]],
  [posts[4], users[0]], [posts[4], users[2]], [posts[4], users[3]],
  [posts[5], users[0]], [posts[5], users[4]],
  [posts[6], users[2]], [posts[6], users[3]],
].map(([post, user], index) => ({ postId: post.id, userId: user.id, createdAt: hoursAgo(index + 1) }));

const adoptions = [
  [posts[0], users[1]], [posts[0], users[2]], [posts[0], users[5]],
  [posts[1], users[0]], [posts[1], users[3]],
  [posts[2], users[0]], [posts[2], users[1]], [posts[2], users[2]],
  [posts[3], users[5]],
  [posts[4], users[0]], [posts[4], users[3]],
  [posts[5], users[0]], [posts[5], users[4]],
  [posts[6], users[2]],
].map(([post, user], index) => ({ postId: post.id, userId: user.id, version: 1, createdAt: hoursAgo(index + 2) }));

const follows = [
  [users[0], users[2]],
  [users[0], users[4]],
  [users[1], users[0]],
  [users[2], users[0]],
  [users[3], users[2]],
  [users[5], users[0]],
].map(([follower, followee], index) => ({
  followerId: follower.id,
  followeeId: followee.id,
  createdAt: daysAgo(index + 1),
}));

function contentHash(files) {
  return createHash("sha256").update(JSON.stringify(files)).digest("hex");
}

function validateSeed() {
  const userIds = new Set(users.map((user) => user.id));
  const postIds = new Set(posts.map((post) => post.id));
  if (userIds.size !== users.length || postIds.size !== posts.length) throw new Error("Demo-IDs müssen eindeutig sein.");

  for (const post of posts) {
    if (!userIds.has(post.authorId)) throw new Error(`Unbekannter Autor für ${post.slug}.`);
    if (post.title.length < 3 || post.title.length > 80) throw new Error(`Ungültiger Titel für ${post.slug}.`);
    if (post.summary.length < 10 || post.summary.length > 600) throw new Error(`Ungültige Beschreibung für ${post.slug}.`);
    if (post.tags.length > 6) throw new Error(`Zu viele Tags für ${post.slug}.`);
    if (post.kind === "config" && post.files.length !== 1) throw new Error(`${post.slug} braucht genau eine Datei.`);
    if (post.kind === "project" && (post.files.length < 1 || post.files.length > 6)) {
      throw new Error(`${post.slug} braucht ein bis sechs Dateien.`);
    }
    for (const file of post.files) {
      if (file.document.schemaVersion !== 3 || file.document.configType !== file.configType) {
        throw new Error(`Ungültiges Generator-Dokument in ${post.slug}.`);
      }
    }
  }

  for (const comment of comments) {
    if (!postIds.has(comment.postId) || !userIds.has(comment.authorId)) {
      throw new Error(`Ungültige Kommentar-Referenz: ${comment.id}.`);
    }
  }
}

async function seedCommunity(sql) {
  return sql.begin(async (tx) => {
    for (const user of users) {
      await tx`
        INSERT INTO users (
          id, name, email, image, password_hash, role, handle, display_name,
          handle_changed_at, created_at, updated_at
        ) VALUES (
          ${user.id}, ${user.name}, ${user.email}, NULL, NULL, 'user', ${user.handle}, ${user.displayName},
          NULL, ${user.createdAt}, ${new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          handle = EXCLUDED.handle,
          display_name = EXCLUDED.display_name,
          updated_at = EXCLUDED.updated_at
      `;
    }

    for (const post of posts) {
      const configTypes = [...new Set(post.files.map((file) => file.configType))];
      await tx`
        INSERT INTO community_posts (
          id, author_id, kind, slug, title, summary, tags, config_types,
          visibility, status, current_version, like_count, adopt_count, comment_count,
          published_at, created_at, updated_at, deleted_at
        ) VALUES (
          ${post.id}, ${post.authorId}, ${post.kind}, ${post.slug}, ${post.title}, ${post.summary},
          ${tx.array(post.tags)}, ${tx.array(configTypes)}, 'public', 'published', 1, 0, 0, 0,
          ${post.publishedAt}, ${post.publishedAt}, ${post.publishedAt}, NULL
        )
        ON CONFLICT (id) DO UPDATE SET
          author_id = EXCLUDED.author_id,
          kind = EXCLUDED.kind,
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          tags = EXCLUDED.tags,
          config_types = EXCLUDED.config_types,
          visibility = EXCLUDED.visibility,
          status = EXCLUDED.status,
          current_version = EXCLUDED.current_version,
          published_at = EXCLUDED.published_at,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          deleted_at = NULL
      `;

      await tx`
        INSERT INTO community_post_versions (
          id, post_id, version, changelog, files, content_hash, created_at
        ) VALUES (
          ${post.versionId}, ${post.id}, 1, NULL, ${tx.json(post.files)}, ${contentHash(post.files)}, ${post.publishedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          post_id = EXCLUDED.post_id,
          version = EXCLUDED.version,
          changelog = EXCLUDED.changelog,
          files = EXCLUDED.files,
          content_hash = EXCLUDED.content_hash,
          created_at = EXCLUDED.created_at
      `;
    }

    for (const comment of comments) {
      await tx`
        INSERT INTO community_comments (
          id, post_id, author_id, parent_id, body, status, created_at, updated_at, edited_at
        ) VALUES (
          ${comment.id}, ${comment.postId}, ${comment.authorId}, ${comment.parentId}, ${comment.body},
          'visible', ${comment.createdAt}, ${comment.createdAt}, NULL
        )
        ON CONFLICT (id) DO UPDATE SET
          post_id = EXCLUDED.post_id,
          author_id = EXCLUDED.author_id,
          parent_id = EXCLUDED.parent_id,
          body = EXCLUDED.body,
          status = EXCLUDED.status,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          edited_at = NULL
      `;
    }

    for (const reaction of reactions) {
      await tx`
        INSERT INTO community_reactions (post_id, user_id, kind, created_at)
        VALUES (${reaction.postId}, ${reaction.userId}, 'like', ${reaction.createdAt})
        ON CONFLICT (post_id, user_id) DO UPDATE SET
          kind = EXCLUDED.kind,
          created_at = EXCLUDED.created_at
      `;
    }

    for (const adoption of adoptions) {
      await tx`
        INSERT INTO community_adoptions (post_id, user_id, version, created_at)
        VALUES (${adoption.postId}, ${adoption.userId}, ${adoption.version}, ${adoption.createdAt})
        ON CONFLICT (post_id, user_id, version) DO UPDATE SET created_at = EXCLUDED.created_at
      `;
    }

    for (const follow of follows) {
      await tx`
        INSERT INTO community_follows (follower_id, followee_id, created_at)
        VALUES (${follow.followerId}, ${follow.followeeId}, ${follow.createdAt})
        ON CONFLICT (follower_id, followee_id) DO UPDATE SET created_at = EXCLUDED.created_at
      `;
    }

    const demoPostIds = posts.map((post) => post.id);
    await tx`
      UPDATE community_posts AS post SET
        like_count = (
          SELECT count(*)::integer FROM community_reactions AS reaction WHERE reaction.post_id = post.id
        ),
        adopt_count = (
          SELECT count(*)::integer FROM community_adoptions AS adoption WHERE adoption.post_id = post.id
        ),
        comment_count = (
          SELECT count(*)::integer FROM community_comments AS comment
          WHERE comment.post_id = post.id AND comment.status = 'visible'
        )
      WHERE post.id IN ${tx(demoPostIds)}
    `;

    return { users: users.length, posts: posts.length };
  });
}

validateSeed();

if (process.argv.includes("--dry-run")) {
  console.log(`Community-Seed ist valide: ${users.length} Accounts und ${posts.length} Posts.`);
} else {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    throw new Error("In Produktion muss das Seed-Script mit --allow-production bestätigt werden.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL muss gesetzt sein.");

  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const result = await seedCommunity(sql);
    console.log(`Community-Seed abgeschlossen: ${result.users} Accounts und ${result.posts} Posts.`);
  } finally {
    await sql.end();
  }
}
