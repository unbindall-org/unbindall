export type CategoryId =
  | "mouse"
  | "crosshair"
  | "viewmodel"
  | "radar"
  | "audio"
  | "hud"
  | "performance"
  | "server"
  | "practice"
  | "launch-options";

export type CommandOption = { value: string | number; label: string };

export const CS2_CATALOG_VERSION = "Build 24957633 (26.08.2026)";

export type CommandStatus = {
  verification: "verified" | "deprecated";
  restrictions: Array<"offline-only" | "requires-cheats">;
  checkedVersion: string;
};

export type CommandDefinition = {
  name: string;
  label: string;
  description: string;
  category: CategoryId;
  type: "toggle" | "range" | "select" | "text" | "action" | "color";
  defaultValue: string | number | boolean;
  enabledByDefault?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: CommandOption[];
  preview?: "crosshair" | "viewmodel" | "radar";
  status: CommandStatus;
};

export const categories: Array<{
  id: CategoryId | "binds";
  label: string;
  shortLabel: string;
  description: string;
}> = [
  { id: "mouse", label: "Maus & Aim", shortLabel: "Maus", description: "Sensitivity und Zoom-Verhalten" },
  { id: "crosshair", label: "Crosshair", shortLabel: "Crosshair", description: "Form, Farbe und Reaktion" },
  { id: "viewmodel", label: "Viewmodel", shortLabel: "Viewmodel", description: "Waffenposition und Sichtfeld" },
  { id: "radar", label: "Radar", shortLabel: "Radar", description: "Übersicht und Map-Ausschnitt" },
  { id: "audio", label: "Audio", shortLabel: "Audio", description: "Lautstärke und Kommunikation" },
  { id: "hud", label: "HUD & Gameplay", shortLabel: "HUD", description: "Interface und Komfort" },
  { id: "performance", label: "Performance", shortLabel: "FPS", description: "Framelimit und Telemetrie" },
  { id: "server", label: "Competitive Server", shortLabel: "Server", description: "Matchformat, Runden, Economy und Teams" },
  { id: "practice", label: "Practice", shortLabel: "Practice", description: "Granaten, Bots, Respawn und Trainingshilfen" },
  { id: "launch-options", label: "Launch Options", shortLabel: "Launch", description: "Startparameter für Steam und CS2" },
  { id: "binds", label: "Keybinds", shortLabel: "Binds", description: "Tasten ohne Konflikte belegen" },
];

const yesNo: CommandOption[] = [
  { value: 1, label: "An" },
  { value: 0, label: "Aus" },
];

type CatalogCommandDefinition = Omit<CommandDefinition, "status"> & { status?: CommandStatus };

const verifiedStatus = (restrictions: CommandStatus["restrictions"] = []): CommandStatus => ({
  verification: "verified",
  restrictions,
  checkedVersion: CS2_CATALOG_VERSION,
});

const deprecatedStatus = (): CommandStatus => ({
  verification: "deprecated",
  restrictions: [],
  checkedVersion: CS2_CATALOG_VERSION,
});

const catalogCommands: CatalogCommandDefinition[] = [
  {
    name: "sensitivity", label: "Maus-Sensitivität", description: "Grundlegende Empfindlichkeit der Maus im Spiel.",
    category: "mouse", type: "range", min: 0.1, max: 5, step: 0.01, defaultValue: 1.25, enabledByDefault: true,
  },
  {
    name: "zoom_sensitivity_ratio", label: "Zoom-Sensitivität", description: "Multiplikator beim Zielen mit Scope.",
    category: "mouse", type: "range", min: 0.5, max: 1.5, step: 0.01, defaultValue: 1, enabledByDefault: true,
  },
  {
    name: "m_pitch", label: "Vertikale Mausachse", description: "Negative Werte invertieren die vertikale Mausbewegung.",
    category: "mouse", type: "select", defaultValue: 0.022, options: [{ value: 0.022, label: "Normal" }, { value: -0.022, label: "Invertiert" }],
  },

  {
    name: "cl_crosshairstyle", label: "Crosshair-Stil", description: "Statisch ist für konsistentes Aiming die beliebteste Wahl.",
    category: "crosshair", type: "select", defaultValue: 4, enabledByDefault: true, preview: "crosshair",
    options: [{ value: 2, label: "Legacy dynamisch" }, { value: 3, label: "Dynamisch" }, { value: 4, label: "Klassisch statisch" }, { value: 5, label: "Hybrid" }],
  },
  {
    name: "cl_crosshairsize", label: "Länge", description: "Länge der vier Crosshair-Linien.",
    category: "crosshair", type: "range", min: 0, max: 10, step: 0.1, defaultValue: 2.5, enabledByDefault: true, preview: "crosshair",
  },
  {
    name: "cl_crosshairgap", label: "Abstand", description: "Abstand zwischen Linien und Bildschirmmitte.",
    category: "crosshair", type: "range", min: -5, max: 5, step: 0.1, defaultValue: -2, enabledByDefault: true, preview: "crosshair",
  },
  {
    name: "cl_crosshairgap_useweaponvalue", label: "Waffenabhängiger Abstand", description: "Passt den Crosshair-Abstand an die ausgerüstete Waffenklasse an.",
    category: "crosshair", type: "toggle", defaultValue: false, options: yesNo, preview: "crosshair",
  },
  {
    name: "cl_crosshairthickness", label: "Stärke", description: "Dicke der Crosshair-Linien.",
    category: "crosshair", type: "range", min: 0.1, max: 3, step: 0.1, defaultValue: 0.5, enabledByDefault: true, preview: "crosshair",
  },
  {
    name: "cl_crosshairdot", label: "Mittelpunkt", description: "Zeigt einen Punkt in der Crosshair-Mitte.",
    category: "crosshair", type: "toggle", defaultValue: false, enabledByDefault: true, options: yesNo, preview: "crosshair",
  },
  {
    name: "cl_crosshair_t", label: "T-Form", description: "Entfernt die obere Linie des Crosshairs.",
    category: "crosshair", type: "toggle", defaultValue: false, enabledByDefault: true, options: yesNo, preview: "crosshair",
  },
  {
    name: "cl_crosshaircolor", label: "Farbmodus", description: "Vordefinierte Farbe oder eigener RGB-Wert.",
    category: "crosshair", type: "select", defaultValue: 1, enabledByDefault: true, preview: "crosshair",
    options: [{ value: 0, label: "Rot" }, { value: 1, label: "Grün" }, { value: 2, label: "Gelb" }, { value: 3, label: "Blau" }, { value: 4, label: "Cyan" }, { value: 5, label: "Eigene Farbe" }],
  },
  {
    name: "cl_crosshaircolor_r", label: "Eigene Farbe: Rot", description: "Rotanteil bei Farbmodus „Eigene Farbe“.",
    category: "crosshair", type: "range", min: 0, max: 255, step: 1, defaultValue: 80, preview: "crosshair",
  },
  {
    name: "cl_crosshaircolor_g", label: "Eigene Farbe: Grün", description: "Grünanteil bei Farbmodus „Eigene Farbe“.",
    category: "crosshair", type: "range", min: 0, max: 255, step: 1, defaultValue: 255, preview: "crosshair",
  },
  {
    name: "cl_crosshaircolor_b", label: "Eigene Farbe: Blau", description: "Blauanteil bei Farbmodus „Eigene Farbe“.",
    category: "crosshair", type: "range", min: 0, max: 255, step: 1, defaultValue: 120, preview: "crosshair",
  },
  {
    name: "cl_crosshairusealpha", label: "Eigene Deckkraft", description: "Verwendet den eingestellten Alpha-Wert für das Crosshair.",
    category: "crosshair", type: "toggle", defaultValue: true, enabledByDefault: true, options: yesNo, preview: "crosshair",
  },
  {
    name: "cl_crosshairalpha", label: "Deckkraft", description: "Sichtbarkeit des Crosshairs.",
    category: "crosshair", type: "range", min: 0, max: 255, step: 1, defaultValue: 255, enabledByDefault: true, preview: "crosshair",
  },
  {
    name: "cl_crosshair_drawoutline", label: "Kontur", description: "Dunkle Kontur für bessere Lesbarkeit.",
    category: "crosshair", type: "toggle", defaultValue: true, enabledByDefault: true, options: yesNo, preview: "crosshair",
  },
  {
    name: "cl_crosshair_outlinethickness", label: "Konturstärke", description: "Stärke der dunklen Crosshair-Kontur.",
    category: "crosshair", type: "range", min: 0.5, max: 3, step: 0.5, defaultValue: 1, preview: "crosshair",
  },
  {
    name: "cl_crosshair_recoil", label: "Recoil verfolgen", description: "Crosshair folgt beim Schießen dem tatsächlichen Rückstoß.",
    category: "crosshair", type: "toggle", defaultValue: false, enabledByDefault: true, options: yesNo,
  },
  {
    name: "cl_crosshair_sniper_width", label: "Sniper-Linienbreite", description: "Breite der Scope-Linien bei Sniper-Gewehren.",
    category: "crosshair", type: "range", min: 1, max: 5, step: 1, defaultValue: 1,
  },

  {
    name: "viewmodel_fov", label: "Viewmodel FOV", description: "Wie weit das Waffenmodell vom Blickfeld entfernt wirkt.",
    category: "viewmodel", type: "range", min: 54, max: 68, step: 1, defaultValue: 68, enabledByDefault: true, preview: "viewmodel",
  },
  {
    name: "viewmodel_offset_x", label: "Horizontal", description: "Verschiebt die Waffe nach links oder rechts.",
    category: "viewmodel", type: "range", min: -2.5, max: 2.5, step: 0.1, defaultValue: 2.5, enabledByDefault: true, preview: "viewmodel",
  },
  {
    name: "viewmodel_offset_y", label: "Tiefe", description: "Verschiebt die Waffe vor oder zurück.",
    category: "viewmodel", type: "range", min: -2, max: 2, step: 0.1, defaultValue: 0, enabledByDefault: true, preview: "viewmodel",
  },
  {
    name: "viewmodel_offset_z", label: "Höhe", description: "Verschiebt die Waffe nach oben oder unten.",
    category: "viewmodel", type: "range", min: -2, max: 2, step: 0.1, defaultValue: -1.5, enabledByDefault: true, preview: "viewmodel",
  },
  {
    name: "cl_prefer_lefthanded", label: "Linkshänder-Ansicht", description: "Zeigt die Waffe standardmäßig in der linken Hand.",
    category: "viewmodel", type: "toggle", defaultValue: false, enabledByDefault: true, options: yesNo, preview: "viewmodel",
  },
  {
    name: "r_drawtracers_firstperson", label: "Eigene Tracer", description: "Zeigt Leuchtspuren der eigenen Schüsse.",
    category: "viewmodel", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "cl_bob_lower_amt", label: "Altes Waffen-Wippen", description: "Ehemaliger CS:GO-Command; ist in CS2 nicht mehr vorhanden und wird nicht exportiert.",
    category: "viewmodel", type: "range", min: 5, max: 30, step: 1, defaultValue: 21, status: deprecatedStatus(),
  },

  {
    name: "cl_radar_always_centered", label: "Immer zentriert", description: "Hält die eigene Position dauerhaft in der Radarmitte.",
    category: "radar", type: "toggle", defaultValue: false, enabledByDefault: true, options: yesNo, preview: "radar",
  },
  {
    name: "cl_radar_rotate", label: "Radar drehen", description: "Richtet das Radar an deiner Blickrichtung aus.",
    category: "radar", type: "toggle", defaultValue: true, enabledByDefault: true, options: yesNo, preview: "radar",
  },
  {
    name: "cl_radar_scale", label: "Map-Zoom", description: "Kleinere Werte zeigen einen größeren Map-Ausschnitt.",
    category: "radar", type: "range", min: 0.25, max: 1, step: 0.01, defaultValue: 0.4, enabledByDefault: true, preview: "radar",
  },
  {
    name: "cl_radar_scale_dynamic", label: "Dynamischer Radar-Zoom", description: "Passt den Radar-Zoom automatisch an erkannte Elemente auf der Map an.",
    category: "radar", type: "toggle", defaultValue: false, options: yesNo, preview: "radar",
  },
  {
    name: "cl_radar_scale_alternate", label: "Alternativer Radar-Zoom", description: "Zoomstufe, zu der ein Radar-Zoom-Bind umschaltet.",
    category: "radar", type: "range", min: 0.25, max: 1, step: 0.01, defaultValue: 1, preview: "radar",
  },
  {
    name: "cl_radar_icon_scale_min", label: "Icon-Größe", description: "Mindestgröße der Spielersymbole auf dem Radar.",
    category: "radar", type: "range", min: 0.4, max: 1.25, step: 0.05, defaultValue: 0.6, enabledByDefault: true, preview: "radar",
  },
  {
    name: "cl_radar_square_with_scoreboard", label: "Quadratisch im Scoreboard", description: "Zeigt im Scoreboard die vollständige quadratische Map.",
    category: "radar", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "cl_hud_radar_scale", label: "Radargröße", description: "Größe des gesamten Radar-Elements im HUD.",
    category: "radar", type: "range", min: 0.8, max: 1.3, step: 0.05, defaultValue: 1, preview: "radar",
  },

  {
    name: "volume", label: "Gesamtlautstärke", description: "Globale Lautstärke des Spiels.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.7, enabledByDefault: true,
  },
  {
    name: "snd_voipvolume", label: "Voice-Chat", description: "Lautstärke deiner Mitspieler im Voice-Chat.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.65, enabledByDefault: true,
  },
  {
    name: "voice_modenable", label: "Voice-Chat aktiv", description: "Schaltet eingehenden und ausgehenden Voice-Chat an oder aus.",
    category: "audio", type: "toggle", defaultValue: true, enabledByDefault: true, options: yesNo,
  },
  {
    name: "snd_mute_losefocus", label: "Im Hintergrund stumm", description: "Schaltet CS2 stumm, während ein anderes Fenster aktiv ist.",
    category: "audio", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "snd_headphone_eq", label: "Kopfhörer-EQ", description: "Klangprofil für räumliche Ortung.",
    category: "audio", type: "select", defaultValue: 0, options: [{ value: 0, label: "Neutral" }, { value: 1, label: "Crisp" }, { value: 2, label: "Smooth" }],
  },
  {
    name: "snd_deathcamera_volume", label: "Deathcam-Musik", description: "Lautstärke der Musik während des Deathcam-Timers.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.16,
  },
  {
    name: "snd_mapobjective_volume", label: "Missionsmusik", description: "Lautstärke der Musik bei Bomben- und anderen Map-Zielen.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.04,
  },
  {
    name: "snd_menumusic_volume", label: "Menü-Musik", description: "Lautstärke der Musik außerhalb eines laufenden Matches.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.04,
  },
  {
    name: "snd_roundend_volume", label: "Rundenende-Musik", description: "Lautstärke der Sieg- und Niederlagenmusik am Rundenende.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.16,
  },
  {
    name: "snd_roundstart_volume", label: "Rundenstart-Musik", description: "Lautstärke der Musik zu Beginn einer Runde.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0,
  },
  {
    name: "snd_mvp_volume", label: "MVP-Musik", description: "Lautstärke der MVP-Musik am Rundenende.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.1,
  },
  {
    name: "snd_tensecondwarning_volume", label: "Zehn-Sekunden-Warnung", description: "Lautstärke der Musik in den letzten zehn Sekunden einer Runde.",
    category: "audio", type: "range", min: 0, max: 1, step: 0.01, defaultValue: 0.2,
  },
  {
    name: "snd_mute_mvp_music_live_players", label: "MVP-Musik bei lebenden Spielern stumm", description: "Unterdrückt MVP-Musik, solange auf beiden Teams noch Spieler leben.",
    category: "audio", type: "toggle", defaultValue: true, options: yesNo,
  },

  {
    name: "hud_scaling", label: "HUD-Größe", description: "Skaliert Interface, Lebensanzeige und Inventar.",
    category: "hud", type: "range", min: 0.5, max: 0.95, step: 0.01, defaultValue: 0.85, enabledByDefault: true,
  },
  {
    name: "cl_hud_color", label: "HUD-Farbe", description: "Farbakzent des Ingame-Interfaces.",
    category: "hud", type: "select", defaultValue: 9, enabledByDefault: true,
    options: [{ value: 0, label: "Teamfarbe" }, { value: 1, label: "Weiß" }, { value: 2, label: "Hellblau" }, { value: 3, label: "Dunkelblau" }, { value: 4, label: "Lila" }, { value: 5, label: "Rot" }, { value: 6, label: "Orange" }, { value: 7, label: "Gelb" }, { value: 8, label: "Grün" }, { value: 9, label: "Türkis" }, { value: 10, label: "Pink" }],
  },
  {
    name: "cl_showloadout", label: "Inventar immer zeigen", description: "Blendet das Waffeninventar dauerhaft ein.",
    category: "hud", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "cl_teamid_overhead_mode", label: "Team-Info über Köpfen", description: "Zeigt Namen und Ausrüstung über Teammitgliedern.",
    category: "hud", type: "select", defaultValue: 2, enabledByDefault: true,
    options: [{ value: 0, label: "Aus" }, { value: 1, label: "Markierung" }, { value: 2, label: "Markierung + Name" }, { value: 3, label: "Markierung + Name + Ausrüstung" }],
  },
  {
    name: "cl_teamid_overhead_colors_show", label: "Teamfarben über Köpfen", description: "Färbt die Overhead-Teaminfo mit der individuellen Spielerfarbe.",
    category: "hud", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "cl_teammate_colors_show", label: "Teamfarben-Modus", description: "Steuert individuelle Farben und Buchstaben für Mitspieler auf Radar und Scoreboard.",
    category: "hud", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Einheitliche Farbe" }, { value: 1, label: "Individuelle Farben" }, { value: 2, label: "Farben + Buchstaben" }],
  },
  {
    name: "cl_use_opens_buy_menu", label: "Benutzen öffnet Kaufmenü", description: "Öffnet mit der Benutzen-Taste das Kaufmenü in der Buyzone.",
    category: "hud", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "closeonbuy", label: "Kaufmenü schließen", description: "Schließt das Kaufmenü nach jedem Einkauf.",
    category: "hud", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "gameinstructor_enable", label: "Spielhinweise", description: "Zeigt kontextuelle Anfängerhinweise im Match.",
    category: "hud", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "cl_color", label: "Bevorzugte Teamfarbe", description: "Legt die bevorzugte Farbe im Team fest.",
    category: "hud", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Gelb" }, { value: 1, label: "Lila" }, { value: 2, label: "Grün" }, { value: 3, label: "Blau" }, { value: 4, label: "Orange" }],
  },
  {
    name: "cl_silencer_mode", label: "Schalldämpfer abnehmen", description: "Erlaubt das Abnehmen des Schalldämpfers per Sekundärangriff.",
    category: "hud", type: "toggle", defaultValue: true, options: yesNo,
  },

  {
    name: "fps_max", label: "FPS-Limit im Spiel", description: "0 entfernt das Framelimit; ein Limit kann Frametimes stabilisieren.",
    category: "performance", type: "range", min: 0, max: 1000, step: 10, defaultValue: 400, enabledByDefault: true, unit: "FPS",
  },
  {
    name: "fps_max_ui", label: "FPS-Limit im Menü", description: "Spart im Hauptmenü Leistung und Energie.",
    category: "performance", type: "range", min: 30, max: 240, step: 10, defaultValue: 120, enabledByDefault: true, unit: "FPS",
  },
  {
    name: "mm_dedicated_search_maxping", label: "Maximaler Matchmaking-Ping", description: "Begrenzt die akzeptierte Serverlatenz bei der Suche.",
    category: "performance", type: "range", min: 25, max: 350, step: 5, defaultValue: 60, enabledByDefault: true, unit: "ms",
  },
  {
    name: "r_fullscreen_gamma", label: "Helligkeit", description: "Kleinere Gammawerte ergeben ein helleres Bild.",
    category: "performance", type: "range", min: 1.6, max: 3, step: 0.1, defaultValue: 2.2,
  },
  {
    name: "cl_hud_telemetry_frametime_show", label: "FPS-Telemetrie", description: "Zeigt Framerate-Probleme im HUD.",
    category: "performance", type: "select", defaultValue: 2, options: [{ value: 0, label: "Nie" }, { value: 1, label: "Bei Problemen" }, { value: 2, label: "Immer" }],
  },
  {
    name: "cl_hud_telemetry_ping_show", label: "Ping-Telemetrie", description: "Zeigt die aktuelle Verbindungslatenz im HUD.",
    category: "performance", type: "select", defaultValue: 2, options: [{ value: 0, label: "Nie" }, { value: 1, label: "Bei Problemen" }, { value: 2, label: "Immer" }],
  },
  {
    name: "cl_hud_telemetry_net_misdelivery_show", label: "Netzwerkfehler", description: "Meldet Paketverluste und fehlgeleitete Pakete.",
    category: "performance", type: "select", defaultValue: 1, options: [{ value: 0, label: "Nie" }, { value: 1, label: "Bei Problemen" }, { value: 2, label: "Immer" }],
  },
  {
    name: "cl_hud_telemetry_net_quality_graph_show", label: "Netzwerkqualitäts-Graph", description: "Visualisiert Paket-Jitter, Verlust und falsche Reihenfolge im HUD.",
    category: "performance", type: "select", defaultValue: 0, options: [{ value: 0, label: "Nie" }, { value: 1, label: "Bei Problemen" }, { value: 2, label: "Immer" }],
  },
  {
    name: "cl_hud_telemetry_serverrecvmargin_graph_show", label: "Server-Empfangs-Graph", description: "Zeigt, wie früh oder spät Eingaben beim Server zur Ausführung eintreffen.",
    category: "performance", type: "select", defaultValue: 0, options: [{ value: 0, label: "Nie" }, { value: 1, label: "Bei Problemen" }, { value: 2, label: "Immer" }],
  },
  {
    name: "net_graph", label: "Altes Netgraph", description: "Der CS:GO-Netgraph wurde entfernt; nutze stattdessen die CS2-Telemetrie-Commands.",
    category: "performance", type: "toggle", defaultValue: false, options: yesNo, status: deprecatedStatus(),
  },

  {
    name: "hostname", label: "Servername", description: "Öffentlicher Name des Dedicated- oder Listen-Servers.",
    category: "server", type: "text", defaultValue: "CS2 Competitive Server",
  },
  {
    name: "sv_password", label: "Server-Passwort", description: "Optionales Passwort für private Matches; leer bedeutet kein Passwort.",
    category: "server", type: "text", defaultValue: "",
  },
  {
    name: "mp_autoteambalance", label: "Automatischer Teamausgleich", description: "Verschiebt Spieler automatisch, um gleich große Teams zu erhalten.",
    category: "server", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "mp_autokick", label: "Automatische Kicks", description: "Entfernt inaktive Spieler sowie Spieler mit übermäßigem Team-Schaden automatisch.",
    category: "server", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "mp_limitteams", label: "Maximale Teamdifferenz", description: "Maximal erlaubter Größenunterschied zwischen beiden Teams; 0 hebt das Limit auf.",
    category: "server", type: "range", min: 0, max: 5, step: 1, defaultValue: 0,
  },
  {
    name: "mp_friendlyfire", label: "Friendly Fire", description: "Aktiviert Schaden an Teammitgliedern.",
    category: "server", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "mp_freezetime", label: "Freeze Time", description: "Sekunden ohne Bewegung zu Beginn jeder Runde.",
    category: "server", type: "range", min: 0, max: 60, step: 1, defaultValue: 15, unit: "s",
  },
  {
    name: "mp_roundtime", label: "Rundenzeit", description: "Allgemeine Rundenlänge in Minuten.",
    category: "server", type: "range", min: 1, max: 60, step: 0.25, defaultValue: 1.92, unit: "min",
  },
  {
    name: "mp_roundtime_defuse", label: "Rundenzeit auf Defuse-Maps", description: "Rundenlänge auf Bomb-Defusal-Maps in Minuten.",
    category: "server", type: "range", min: 1, max: 60, step: 0.25, defaultValue: 1.92, unit: "min",
  },
  {
    name: "mp_maxrounds", label: "Maximale Rundenzahl", description: "Beendet das Match nach dieser Anzahl regulärer Runden; 0 deaktiviert das Limit.",
    category: "server", type: "range", min: 0, max: 60, step: 1, defaultValue: 24,
  },
  {
    name: "mp_halftime", label: "Seitenwechsel zur Halbzeit", description: "Tauscht Terrorists und Counter-Terrorists nach der Hälfte der Runden.",
    category: "server", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "mp_halftime_duration", label: "Halbzeit-Dauer", description: "Zieldauer der Halbzeitpause in Sekunden.",
    category: "server", type: "range", min: 0, max: 300, step: 5, defaultValue: 15, unit: "s",
  },
  {
    name: "mp_halftime_pausematch", label: "Nach Halbzeit pausieren", description: "Pausiert das Match nach dem Halbzeit-Countdown bis zur Freigabe durch Vote oder Admin.",
    category: "server", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "mp_match_can_clinch", label: "Match vorzeitig entscheiden", description: "Beendet ein Match, sobald das zurückliegende Team nicht mehr aufholen kann.",
    category: "server", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "mp_overtime_enable", label: "Overtime", description: "Startet bei Gleichstand eine Verlängerung.",
    category: "server", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "mp_overtime_limit", label: "Maximale Overtimes", description: "Begrenzt die Zahl der Verlängerungen; 0 erlaubt unbegrenzt viele.",
    category: "server", type: "range", min: 0, max: 20, step: 1, defaultValue: 0,
  },
  {
    name: "mp_overtime_maxrounds", label: "Overtime-Runden", description: "Anzahl der Runden pro Overtime-Abschnitt.",
    category: "server", type: "range", min: 2, max: 30, step: 2, defaultValue: 6,
  },
  {
    name: "mp_overtime_startmoney", label: "Overtime-Startgeld", description: "Geldbetrag für alle Spieler zu Beginn jeder Overtime-Hälfte.",
    category: "server", type: "range", min: 0, max: 65535, step: 100, defaultValue: 10000, unit: "$",
  },
  {
    name: "mp_overtime_halftime_pausetimer", label: "Overtime-Halbzeit anhalten", description: "Hält den Halbzeit-Timer vor jeder neuen Overtime-Hälfte an.",
    category: "server", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "mp_startmoney", label: "Startgeld", description: "Geldbetrag zu Beginn eines Matches oder nach einem Reset.",
    category: "server", type: "range", min: 0, max: 65535, step: 100, defaultValue: 800, unit: "$",
  },
  {
    name: "mp_maxmoney", label: "Maximales Geld", description: "Obergrenze für das Guthaben eines Spielers.",
    category: "server", type: "range", min: 0, max: 65535, step: 100, defaultValue: 16000, unit: "$",
  },
  {
    name: "mp_buytime", label: "Kaufzeit", description: "Sekunden nach Rundenstart, in denen gekauft werden darf.",
    category: "server", type: "range", min: 0, max: 9999, step: 5, defaultValue: 20, unit: "s",
  },
  {
    name: "mp_c4timer", label: "C4-Timer", description: "Sekunden zwischen dem Legen und der Explosion der Bombe.",
    category: "server", type: "range", min: 10, max: 90, step: 5, defaultValue: 40, unit: "s",
  },
  {
    name: "mp_team_timeout_max", label: "Taktische Timeouts", description: "Maximale Anzahl taktischer Pausen pro Team.",
    category: "server", type: "range", min: 0, max: 10, step: 1, defaultValue: 4,
  },
  {
    name: "mp_team_timeout_time", label: "Timeout-Dauer", description: "Dauer einer taktischen Pause in Sekunden.",
    category: "server", type: "range", min: 10, max: 300, step: 5, defaultValue: 30, unit: "s",
  },
  {
    name: "mp_technical_timeout_per_team", label: "Technische Timeouts", description: "Anzahl technischer Pausen, die jedem Team zur Verfügung stehen.",
    category: "server", type: "range", min: 0, max: 10, step: 1, defaultValue: 0,
  },
  {
    name: "mp_technical_timeout_duration_s", label: "Technische Timeout-Dauer", description: "Volle Dauer einer technischen Pause in Sekunden.",
    category: "server", type: "range", min: 0, max: 600, step: 15, defaultValue: 0, unit: "s",
  },
  {
    name: "mp_forcecamera", label: "Zuschauerkamera nach dem Tod", description: "Beschränkt, welche Spieler nach dem Tod beobachtet werden können.",
    category: "server", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Alle Spieler" }, { value: 1, label: "Nur eigenes Team" }, { value: 2, label: "Nur eigene Position" }],
  },
  {
    name: "mp_solid_teammates", label: "Kollision mit Teammitgliedern", description: "Steuert Kollision und Wegdrücken zwischen Teammitgliedern.",
    category: "server", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Aus" }, { value: 1, label: "Kollision an" }, { value: 2, label: "Nur wegdrücken" }],
  },
  {
    name: "sv_pausable", label: "Manuelle Pausen erlauben", description: "Erlaubt berechtigten Spielern oder Admins, das Match zu pausieren.",
    category: "server", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "sv_matchpause_auto_5v5", label: "Bei fehlenden Spielern pausieren", description: "Pausiert in der nächsten Freeze Time automatisch, sobald ein Team weniger als fünf Spieler hat.",
    category: "server", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "mp_backup_round_auto", label: "Automatische Round-Backups", description: "Hält Runden-Backups im Speicher, um Matches nach Verbindungsabbrüchen wiederherzustellen.",
    category: "server", type: "toggle", defaultValue: true, options: yesNo,
  },
  {
    name: "mp_backup_round_file", label: "Round-Backup-Präfix", description: "Dateipräfix für gespeicherte Round-Backups; leer deaktiviert die Dateien.",
    category: "server", type: "text", defaultValue: "backup",
  },
  {
    name: "mp_spectators_max", label: "Maximale Zuschauer", description: "Begrenzt die Anzahl der Zuschauerplätze im Match.",
    category: "server", type: "range", min: 0, max: 64, step: 1, defaultValue: 2,
  },
  {
    name: "mp_tkpunish", label: "Teamkills bestrafen", description: "Bestraft Teamkiller in der folgenden Runde.",
    category: "server", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "mp_teamname_1", label: "Name von Team 1", description: "Überschreibt den angezeigten Namen des ersten Teams.",
    category: "server", type: "text", defaultValue: "",
  },
  {
    name: "mp_teamname_2", label: "Name von Team 2", description: "Überschreibt den angezeigten Namen des zweiten Teams.",
    category: "server", type: "text", defaultValue: "",
  },
  {
    name: "mp_warmuptime", label: "Warmup-Dauer", description: "Dauer der Aufwärmphase in Sekunden.",
    category: "server", type: "range", min: 5, max: 3600, step: 5, defaultValue: 60, unit: "s",
  },
  {
    name: "mp_warmup_pausetimer", label: "Warmup-Timer anhalten", description: "Hält das Warmup unbegrenzt an, bis ein Admin es fortsetzt oder beendet.",
    category: "server", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "mp_restartgame", label: "Match neu starten", description: "Startet das Match nach der angegebenen Verzögerung neu.",
    category: "server", type: "range", min: 1, max: 60, step: 1, defaultValue: 1, unit: "s",
  },

  {
    name: "sv_cheats", label: "Cheat-Commands freischalten", description: "Erlaubt Cheat-geschützte Trainingsbefehle auf einem lokalen oder kontrollierten Server.",
    category: "practice", type: "toggle", defaultValue: true, options: yesNo, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "god", label: "Unverwundbarkeit", description: "Verhindert Schaden am eigenen Spieler für reproduzierbares Training.",
    category: "practice", type: "toggle", defaultValue: false, options: yesNo,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "sv_regeneration_force_on", label: "Gesundheit regenerieren", description: "Regeneriert erlittenen Schaden während längerer Trainingsabläufe.",
    category: "practice", type: "toggle", defaultValue: false, options: yesNo,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "sv_infinite_ammo", label: "Unendliche Munition", description: "Verhindert Munitionsverbrauch; Modus 2 behält den normalen Reload bei.",
    category: "practice", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Aus" }, { value: 1, label: "Ohne Reload" }, { value: 2, label: "Mit Reload" }],
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "ammo_grenade_limit_total", label: "Granatenlimit", description: "Erhöht die Gesamtzahl gleichzeitig getragener Granaten für Lineup-Training.",
    category: "practice", type: "range", min: 1, max: 6, step: 1, defaultValue: 6, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "mp_buy_anywhere", label: "Überall kaufen", description: "Erlaubt Käufe außerhalb der Buyzone für beide Teams.",
    category: "practice", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Aus" }, { value: 1, label: "Beide Teams" }, { value: 2, label: "Nur Terrorists" }, { value: 3, label: "Nur Counter-Terrorists" }],
    status: verifiedStatus(["offline-only"]),
  },
  {
    name: "mp_free_armor", label: "Kostenlose Rüstung", description: "Gibt Spielern beim Spawn automatisch Rüstung oder Rüstung plus Helm.",
    category: "practice", type: "select", defaultValue: 2,
    options: [{ value: 0, label: "Aus" }, { value: 1, label: "Rüstung" }, { value: 2, label: "Rüstung + Helm" }],
    status: verifiedStatus(["offline-only"]),
  },
  {
    name: "mp_respawn_on_death_ct", label: "CTs automatisch respawnen", description: "Lässt Counter-Terrorists direkt nach dem Tod wieder einsteigen.",
    category: "practice", type: "toggle", defaultValue: true, options: yesNo, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "mp_respawn_on_death_t", label: "Ts automatisch respawnen", description: "Lässt Terrorists direkt nach dem Tod wieder einsteigen.",
    category: "practice", type: "toggle", defaultValue: true, options: yesNo, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "mp_respawn_immunitytime", label: "Spawn-Schutz", description: "Sekunden mit Unverwundbarkeit nach einem Respawn.",
    category: "practice", type: "range", min: -1, max: 30, step: 0.5, defaultValue: 4, unit: "s", status: verifiedStatus(["offline-only"]),
  },
  {
    name: "mp_ignore_round_win_conditions", label: "Rundenende ignorieren", description: "Hält die Trainingsrunde trotz erfüllter Siegbedingung am Laufen.",
    category: "practice", type: "toggle", defaultValue: true, options: yesNo, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "sv_grenade_trajectory_prac_pipreview", label: "Granaten-Landevorschau", description: "Zeigt beim Zielen eine Bild-in-Bild-Vorschau des Landepunkts.",
    category: "practice", type: "toggle", defaultValue: true, options: yesNo,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "sv_grenade_trajectory_prac_trailtime", label: "Granatenflugbahn-Dauer", description: "Zeigt die Trainingsflugbahn einer Granate für mehrere Sekunden.",
    category: "practice", type: "range", min: 0, max: 8, step: 0.5, defaultValue: 8, unit: "s",
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "sv_showimpacts", label: "Trefferpunkte anzeigen", description: "Visualisiert Einschläge clientseitig, serverseitig oder in beiden Farben.",
    category: "practice", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Aus" }, { value: 1, label: "Client + Server" }, { value: 2, label: "Nur Client" }, { value: 3, label: "Nur Server" }],
    status: verifiedStatus(["offline-only"]),
  },
  {
    name: "sv_showimpacts_time", label: "Trefferpunkt-Dauer", description: "Legt fest, wie lange Einschlagmarkierungen sichtbar bleiben.",
    category: "practice", type: "range", min: 0, max: 10, step: 0.5, defaultValue: 4, unit: "s",
    status: verifiedStatus(["offline-only"]),
  },
  {
    name: "sv_showimpacts_penetration", label: "Penetrationsdaten anzeigen", description: "Zeigt zusätzliche Informationen, wenn Kugeln Oberflächen durchdringen.",
    category: "practice", type: "toggle", defaultValue: false, options: yesNo, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "bot_difficulty", label: "Bot-Schwierigkeit", description: "Legt die Spielstärke neu hinzugefügter Bots fest.",
    category: "practice", type: "select", defaultValue: 1,
    options: [{ value: 0, label: "Leicht" }, { value: 1, label: "Normal" }, { value: 2, label: "Schwer" }, { value: 3, label: "Experte" }],
    status: verifiedStatus(["offline-only"]),
  },
  {
    name: "bot_crouch", label: "Bots ducken", description: "Zwingt Bots zum Ducken, etwa für Headshot- oder Winkeltraining.",
    category: "practice", type: "toggle", defaultValue: false, options: yesNo,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "bot_dont_shoot", label: "Bots schießen nicht", description: "Verhindert, dass Bots während des Trainings feuern.",
    category: "practice", type: "toggle", defaultValue: false, options: yesNo,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "bot_stop", label: "Bots anhalten", description: "Friert alle Bots an ihrer aktuellen Position ein.",
    category: "practice", type: "toggle", defaultValue: true, options: yesNo,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "bot_mimic", label: "Bots spiegeln Eingaben", description: "Lässt Bots die Eingaben des Hosts spiegeln.",
    category: "practice", type: "toggle", defaultValue: false, options: yesNo,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "bot_kick", label: "Bots entfernen", description: "Entfernt beim Laden der Practice-Config alle Bots vom Server.",
    category: "practice", type: "action", defaultValue: true, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "bot_add_ct", label: "CT-Bot hinzufügen", description: "Fügt beim Ausführen einen Counter-Terrorist-Bot hinzu.",
    category: "practice", type: "action", defaultValue: true, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "bot_add_t", label: "T-Bot hinzufügen", description: "Fügt beim Ausführen einen Terrorist-Bot hinzu.",
    category: "practice", type: "action", defaultValue: true, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "bot_place", label: "Bot platzieren", description: "Versetzt einen vorhandenen Bot an die Stelle, auf die der Host zielt.",
    category: "practice", type: "action", defaultValue: true,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "mp_warmup_end", label: "Warmup sofort beenden", description: "Beendet beim Laden der Config die laufende Aufwärmphase.",
    category: "practice", type: "action", defaultValue: true, status: verifiedStatus(["offline-only"]),
  },
  {
    name: "sv_rethrow_last_grenade", label: "Letzte Granate erneut werfen", description: "Wiederholt beim Ausführen den zuletzt aufgezeichneten Granatenwurf.",
    category: "practice", type: "action", defaultValue: true,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },
  {
    name: "noclip", label: "Noclip umschalten", description: "Schaltet beim Ausführen freien Flug durch die Map an oder aus.",
    category: "practice", type: "action", defaultValue: true,
    status: verifiedStatus(["offline-only", "requires-cheats"]),
  },

  {
    name: "launch_console", label: "Konsole beim Start öffnen", description: "Öffnet die Entwicklerkonsole direkt beim Start von CS2.",
    category: "launch-options", type: "toggle", defaultValue: true, enabledByDefault: true, options: yesNo,
  },
  {
    name: "launch_display_mode", label: "Anzeigemodus erzwingen", description: "Startet CS2 wahlweise im Vollbild- oder Fenstermodus.",
    category: "launch-options", type: "select", defaultValue: "default",
    options: [{ value: "default", label: "Nicht erzwingen" }, { value: "fullscreen", label: "Vollbild" }, { value: "windowed", label: "Fenstermodus" }],
  },
  {
    name: "launch_width", label: "Startbreite", description: "Erzwingt die horizontale Auflösung beim Start.",
    category: "launch-options", type: "range", min: 640, max: 7680, step: 1, defaultValue: 1920, unit: "px",
  },
  {
    name: "launch_height", label: "Starthöhe", description: "Erzwingt die vertikale Auflösung beim Start.",
    category: "launch-options", type: "range", min: 480, max: 4320, step: 1, defaultValue: 1080, unit: "px",
  },
  {
    name: "launch_safe", label: "Abgesicherter Modus", description: "Startet mit minimalen Videoeinstellungen zur Fehlerbehebung.",
    category: "launch-options", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "launch_autoconfig", label: "Videokonfiguration zurücksetzen", description: "Lässt Steam beim nächsten Start automatisch kompatible Videoeinstellungen wählen.",
    category: "launch-options", type: "toggle", defaultValue: false, options: yesNo,
  },
  {
    name: "launch_extra", label: "Weitere Startparameter", description: "Zusätzliche, durch Leerzeichen getrennte Startparameter für erfahrene Nutzer.",
    category: "launch-options", type: "text", defaultValue: "",
  },
];

export const commands: CommandDefinition[] = catalogCommands.map((command) => ({
  ...command,
  status: command.status ?? verifiedStatus(),
}));

export const bindActions = [
  { id: "forward", group: "Bewegung", label: "Vorwärts", command: "+forward", defaultKey: "w", defaultEnabled: true },
  { id: "back", group: "Bewegung", label: "Rückwärts", command: "+back", defaultKey: "s", defaultEnabled: true },
  { id: "left", group: "Bewegung", label: "Nach links", command: "+left", defaultKey: "a", defaultEnabled: true },
  { id: "right", group: "Bewegung", label: "Nach rechts", command: "+right", defaultKey: "d", defaultEnabled: true },
  { id: "jump", group: "Bewegung", label: "Springen", command: "+jump", defaultKey: "space", defaultEnabled: true },
  { id: "duck", group: "Bewegung", label: "Ducken", command: "+duck", defaultKey: "ctrl", defaultEnabled: true },
  { id: "sprint", group: "Bewegung", label: "Leise gehen", command: "+sprint", defaultKey: "shift", defaultEnabled: true },
  { id: "attack", group: "Kampf", label: "Primärangriff", command: "+attack", defaultKey: "mouse1", defaultEnabled: true },
  { id: "attack2", group: "Kampf", label: "Sekundärangriff", command: "+attack2", defaultKey: "mouse2", defaultEnabled: true },
  { id: "reload", group: "Kampf", label: "Nachladen", command: "+reload", defaultKey: "r", defaultEnabled: true },
  { id: "use", group: "Kampf", label: "Benutzen", command: "+use", defaultKey: "e", defaultEnabled: true },
  { id: "inspect", group: "Kampf", label: "Waffe inspizieren", command: "+lookatweapon", defaultKey: "f", defaultEnabled: true },
  { id: "drop", group: "Kampf", label: "Waffe droppen", command: "drop", defaultKey: "g", defaultEnabled: true },
  { id: "lastinv", group: "Kampf", label: "Letzte Waffe", command: "lastinv", defaultKey: "q", defaultEnabled: true },
  { id: "primary", group: "Waffen", label: "Primärwaffe", command: "slot1", defaultKey: "1", defaultEnabled: true },
  { id: "secondary", group: "Waffen", label: "Sekundärwaffe", command: "slot2", defaultKey: "2", defaultEnabled: true },
  { id: "knife", group: "Waffen", label: "Messer", command: "slot3", defaultKey: "3", defaultEnabled: true },
  { id: "cyclegrenades", group: "Waffen", label: "Granaten durchschalten", command: "slot4", defaultKey: "4", defaultEnabled: true },
  { id: "bomb", group: "Waffen", label: "Bombe ausrüsten", command: "slot5", defaultKey: "5", defaultEnabled: true },
  { id: "he", group: "Granaten", label: "HE-Granate", command: "slot6", defaultKey: "c", defaultEnabled: false },
  { id: "flash", group: "Granaten", label: "Flashbang", command: "slot7", defaultKey: "z", defaultEnabled: false },
  { id: "smoke", group: "Granaten", label: "Smoke", command: "slot8", defaultKey: "x", defaultEnabled: false },
  { id: "decoy", group: "Granaten", label: "Decoy", command: "slot9", defaultKey: "6", defaultEnabled: false },
  { id: "molotov", group: "Granaten", label: "Molotov / Incendiary", command: "slot10", defaultKey: "v", defaultEnabled: false },
  { id: "voice", group: "Kommunikation", label: "Push-to-talk", command: "+voicerecord", defaultKey: "mouse4", defaultEnabled: true },
  { id: "ping", group: "Kommunikation", label: "Spieler-Ping", command: "player_ping", defaultKey: "mouse3", defaultEnabled: true },
  { id: "radio", group: "Kommunikation", label: "Radio-Menü", command: "radio", defaultKey: "z", defaultEnabled: false },
  { id: "scoreboard", group: "Interface", label: "Scoreboard", command: "+showscores", defaultKey: "tab", defaultEnabled: true },
  { id: "buy", group: "Interface", label: "Kaufmenü", command: "buymenu", defaultKey: "b", defaultEnabled: true },
  { id: "team", group: "Interface", label: "Teamauswahl", command: "teammenu", defaultKey: "m", defaultEnabled: true },
  { id: "spray", group: "Interface", label: "Spray-Menü", command: "+spray_menu", defaultKey: "t", defaultEnabled: true },
  { id: "console", group: "Interface", label: "Konsole", command: "toggleconsole", defaultKey: "`", defaultEnabled: false },
  { id: "cleardecals", group: "Interface", label: "Konsole leeren", command: "clear", defaultKey: "-", defaultEnabled: false },
] as const;

export type ConfigState = Record<string, string | number | boolean>;

export function createDefaultState(): ConfigState {
  return Object.fromEntries(commands.flatMap((command) => [
    [command.name, command.defaultValue],
    [`enabled:${command.name}`, Boolean(command.enabledByDefault)],
  ]));
}

export const presets: Array<{ name: string; label: string; description: string; values: ConfigState }> = [
  {
    name: "competitive",
    label: "Competitive",
    description: "Klares Crosshair, weites Radar, stabiles Viewmodel",
    values: {
      sensitivity: 1.25,
      cl_crosshairstyle: 4,
      cl_crosshairsize: 2.5,
      cl_crosshairgap: -2,
      cl_crosshairthickness: 0.5,
      cl_crosshaircolor: 1,
      cl_crosshairalpha: 255,
      cl_crosshair_drawoutline: true,
      viewmodel_fov: 68,
      viewmodel_offset_x: 2.5,
      viewmodel_offset_y: 0,
      viewmodel_offset_z: -1.5,
      cl_radar_always_centered: false,
      cl_radar_rotate: true,
      cl_radar_scale: 0.4,
      cl_radar_icon_scale_min: 0.6,
      fps_max: 400,
    },
  },
  {
    name: "minimal",
    label: "Minimal",
    description: "Kompaktes HUD und kleines statisches Crosshair",
    values: {
      cl_crosshairsize: 1.5,
      cl_crosshairgap: -3,
      cl_crosshairthickness: 0.5,
      cl_crosshairdot: false,
      cl_crosshair_drawoutline: false,
      hud_scaling: 0.7,
      cl_hud_color: 1,
      cl_showloadout: false,
      cl_radar_scale: 0.35,
    },
  },
  {
    name: "accessible",
    label: "Gut sichtbar",
    description: "Große UI, kräftiges Crosshair und klare Team-Infos",
    values: {
      cl_crosshairsize: 3.5,
      cl_crosshairgap: -1,
      cl_crosshairthickness: 1,
      cl_crosshaircolor: 2,
      cl_crosshair_drawoutline: true,
      cl_crosshair_outlinethickness: 1.5,
      hud_scaling: 0.95,
      cl_teamid_overhead_mode: 2,
      cl_radar_icon_scale_min: 0.9,
      cl_hud_radar_scale: 1.2,
    },
  },
  {
    name: "server-competitive",
    label: "Competitive Server",
    description: "MR12, Overtime, Pausen und reguläre Economy",
    values: {
      mp_autoteambalance: false,
      mp_autokick: false,
      mp_limitteams: 0,
      mp_friendlyfire: true,
      mp_freezetime: 15,
      mp_roundtime_defuse: 1.92,
      mp_maxrounds: 24,
      mp_halftime: true,
      mp_halftime_duration: 15,
      mp_halftime_pausematch: false,
      mp_match_can_clinch: true,
      mp_overtime_enable: true,
      mp_overtime_limit: 0,
      mp_overtime_maxrounds: 6,
      mp_overtime_startmoney: 10000,
      mp_overtime_halftime_pausetimer: false,
      mp_startmoney: 800,
      mp_maxmoney: 16000,
      mp_buytime: 20,
      mp_c4timer: 40,
      mp_team_timeout_max: 4,
      mp_team_timeout_time: 30,
      mp_technical_timeout_per_team: 1,
      mp_technical_timeout_duration_s: 120,
      mp_forcecamera: 1,
      mp_solid_teammates: 1,
      sv_pausable: true,
      sv_matchpause_auto_5v5: true,
      mp_backup_round_auto: true,
      mp_backup_round_file: "backup",
      mp_spectators_max: 2,
      mp_tkpunish: false,
      mp_warmuptime: 60,
      mp_warmup_pausetimer: false,
      mp_restartgame: 1,
    },
  },
  {
    name: "practice",
    label: "Practice",
    description: "Nade-Lineups, unendliche Munition und freie Bewegung",
    values: {
      sv_cheats: true,
      sv_infinite_ammo: 1,
      ammo_grenade_limit_total: 6,
      mp_buy_anywhere: 1,
      mp_buytime: 9999,
      mp_freezetime: 0,
      mp_roundtime_defuse: 60,
      mp_free_armor: 2,
      mp_respawn_on_death_ct: true,
      mp_respawn_on_death_t: true,
      mp_respawn_immunitytime: 0,
      mp_ignore_round_win_conditions: true,
      sv_grenade_trajectory_prac_pipreview: true,
      sv_grenade_trajectory_prac_trailtime: 8,
      sv_showimpacts: 1,
      sv_showimpacts_time: 4,
      sv_showimpacts_penetration: true,
      bot_kick: true,
      mp_warmup_end: true,
      mp_restartgame: 1,
    },
  },
];
