"use client";

import { useId } from "react";
import type { ConfigState } from "../catalog/commands";
import { useTranslation } from "react-i18next";

function numberValue(state: ConfigState, key: string, fallback: number) {
  const value = Number(state[key]);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/* --------------------------------------------------------------------------
   Crosshair — a first person look down an A site, with the real crosshair
   drawn on top in screen pixels so length, gap and thickness stay honest.
   -------------------------------------------------------------------------- */

function CrosshairScene({ id }: { id: string }) {
  return (
    <svg className="scene" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fa6b8" /><stop offset="55%" stopColor="#c3b295" /><stop offset="100%" stopColor="#dcc9a4" />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9c8055" /><stop offset="100%" stopColor="#6a563a" />
        </linearGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4b3d2a" /><stop offset="100%" stopColor="#7d6748" />
        </linearGradient>
        <radialGradient id={`${id}-vignette`} cx="50%" cy="48%" r="72%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".55" />
        </radialGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${id}-sky)`} />

      {/* skyline */}
      <g fill="#a8927140" >
        <rect x="96" y="62" width="52" height="46" /><rect x="152" y="72" width="30" height="36" />
        <rect x="188" y="56" width="44" height="52" /><rect x="236" y="76" width="26" height="32" />
      </g>
      <g fill="#8d7a5c">
        <rect x="104" y="70" width="46" height="38" /><rect x="156" y="80" width="26" height="28" />
        <rect x="190" y="66" width="40" height="42" />
      </g>
      <g fill="#5c4c35">
        <rect x="112" y="78" width="7" height="9" /><rect x="126" y="78" width="7" height="9" />
        <rect x="112" y="92" width="7" height="9" /><rect x="126" y="92" width="7" height="9" />
        <rect x="198" y="74" width="8" height="10" /><rect x="214" y="74" width="8" height="10" />
        <rect x="198" y="90" width="8" height="10" /><rect x="214" y="90" width="8" height="10" />
      </g>

      {/* ground */}
      <rect x="0" y="104" width="320" height="76" fill={`url(#${id}-ground)`} />
      <path d="M0 128 H320" stroke="#00000018" strokeWidth="10" />

      {/* side walls in perspective */}
      <path d="M0 0 L58 30 L58 154 L0 180 Z" fill={`url(#${id}-wall)`} />
      <path d="M58 30 L58 154 L64 150 L64 36 Z" fill="#2c2418" opacity=".5" />
      <path d="M320 0 L252 24 L252 158 L320 180 Z" fill={`url(#${id}-wall)`} opacity=".92" />
      <path d="M252 24 L252 158 L246 154 L246 30 Z" fill="#2c2418" opacity=".5" />

      {/* palm silhouettes */}
      <g fill="#3f4a2c" opacity=".85">
        <path d="M78 108 l4-42 5 0 -3 42Z" />
        <path d="M84 66 c-13-9-24-7-28 1 10-4 18-3 26 4Zm0 0 c12-10 24-9 28-1-10-4-18-2-26 5Zm0 0 c-6-13-3-22 5-25-4 9-4 16-1 24Zm0 0 c9-6 18-3 20 5-7-6-13-7-19-3Zm0 0 c-10-5-19-1-20 7 6-6 12-8 19-4Z" />
        <path d="M243 112 l3-34 4 0 -2 34Z" />
        <path d="M247 78 c-10-7-19-5-22 1 8-3 14-2 20 3Zm0 0 c9-8 19-7 22-1-8-3-14-2-20 4Zm0 0 c-5-10-2-17 4-19-3 7-3 12-1 18Z" />
      </g>

      {/* site crates */}
      <g>
        <path d="M186 96 L232 92 L232 130 L186 138 Z" fill="#8a6d45" />
        <path d="M186 96 L162 100 L162 134 L186 138 Z" fill="#6b5334" />
        <path d="M162 100 L186 96 L232 92 L208 88 Z" fill="#a3854f" />
        <path d="M190 104 L228 100 L228 126 L190 132 Z" fill="none" stroke="#5c4527" strokeWidth="2.5" />
        <path d="M112 116 L140 113 L140 140 L112 145 Z" fill="#7d6340" />
        <path d="M112 116 L94 119 L94 143 L112 145 Z" fill="#5f4b30" />
        <path d="M94 119 L112 116 L140 113 L122 111 Z" fill="#96794a" />
      </g>

      {/* players */}
      <g fill="#242b21">
        <g transform="translate(206 78)">
          <circle cx="0" cy="0" r="6" /><path d="M-7 7 h14 l3 22 h-20Z" /><path d="M-9 12 l-6 16 3 2 7-13Z" />
        </g>
        <g transform="translate(148 96) scale(.62)" opacity=".9">
          <circle cx="0" cy="0" r="6" /><path d="M-7 7 h14 l3 22 h-20Z" /><path d="M4 30 h6 l1 16h-6Z" /><path d="M-10 30 h6 l-1 16h-6Z" />
        </g>
      </g>

      <rect width="320" height="180" fill={`url(#${id}-vignette)`} />
    </svg>
  );
}

export function CrosshairPreview({ state, compact = false }: { state: ConfigState; compact?: boolean }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, "");
  const scale = compact ? 2.6 : 3.2;
  const size = Math.max(numberValue(state, "cl_crosshairsize", 2.5), 0) * scale;
  const thickness = Math.max(numberValue(state, "cl_crosshairthickness", 0.5) * 1.9, 1);
  const style = numberValue(state, "cl_crosshairstyle", 4);
  const weaponGap = Boolean(state.cl_crosshairgap_useweaponvalue);
  const rawGap = weaponGap ? -1 : numberValue(state, "cl_crosshairgap", -2);
  const gap = Math.max((rawGap + 5) * 1.2 + (style === 3 || style === 2 ? 3 : 1), 0);
  const alpha = state.cl_crosshairusealpha === false ? 1 : clamp(numberValue(state, "cl_crosshairalpha", 255) / 255, 0.12, 1);
  const colorMode = numberValue(state, "cl_crosshaircolor", 1);
  const colors = ["#ff4141", "#55ff75", "#ffe75c", "#62a8ff", "#35f2e7"];
  const color = colorMode === 5
    ? `rgb(${numberValue(state, "cl_crosshaircolor_r", 80)}, ${numberValue(state, "cl_crosshaircolor_g", 255)}, ${numberValue(state, "cl_crosshaircolor_b", 120)})`
    : colors[colorMode] ?? colors[1];
  const outline = state.cl_crosshair_drawoutline !== false;
  const outlineWidth = clamp(numberValue(state, "cl_crosshair_outlinethickness", 1), 0.5, 3);
  const common = {
    background: color,
    opacity: alpha,
    boxShadow: outline ? `0 0 0 ${outlineWidth}px rgba(0, 0, 0, .85)` : "none",
  };
  const dot = Math.max(thickness, 2);

  return (
    <div className={`crosshair-preview ${compact ? "is-compact" : ""}`} aria-label={t("Crosshair-Vorschau")}>
      <div className="crosshair-scene">
        <CrosshairScene id={id} />
        <div className="crosshair" style={{ "--gap": `${gap}px`, "--size": `${size}px`, "--thickness": `${thickness}px` } as React.CSSProperties}>
          {!state.cl_crosshair_t && <i className="crosshair-line top" style={common} />}
          <i className="crosshair-line right" style={common} />
          <i className="crosshair-line bottom" style={common} />
          <i className="crosshair-line left" style={common} />
          {Boolean(state.cl_crosshairdot) && <i className="crosshair-dot" style={{ ...common, width: dot, height: dot }} />}
        </div>
      </div>
      {!compact && <div className="preview-caption"><span>LIVE</span> Mirage · A Site</div>}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Radar — a readable map layout instead of rotated blocks. Every floor shape
   is painted twice: once fat and dark for the outer wall, once on top in the
   floor tone, so the union reads as one map without inner seams.
   -------------------------------------------------------------------------- */

const RADAR_FLOOR = [
  "M120 18 H184 V58 L156 70 L120 56 Z",        // A site
  "M152 62 H180 V94 H152 Z",                    // palace
  "M154 54 H186 V98 H154 Z",                    // A / CT link
  "M126 94 H186 V132 H126 Z",                   // CT spawn
  "M116 72 H156 V96 H116 Z",                    // connector
  "M92 42 H116 V152 H92 Z",                     // mid
  "M68 58 H96 V88 H68 Z",                       // window room
  "M100 38 H122 V60 H100 Z",                    // ramp to A
  "M18 24 H74 V62 L46 74 L18 60 Z",             // B site
  "M44 60 H74 V106 H44 Z",                      // apartments
  "M16 90 H62 V124 H16 Z",                      // market
  "M58 102 H96 V124 H58 Z",                     // market to mid
  "M16 118 H42 V170 H16 Z",                     // outside long
  "M16 150 H62 V174 H16 Z",                     // T access
  "M56 150 H148 V190 H56 Z",                    // T spawn
  "M140 130 H180 V170 H140 Z",                  // CT rotate
  "M138 160 H182 V186 H138 Z",
];

function RadarMap() {
  return (
    <>
      <g fill="#232a30" stroke="#232a30" strokeWidth="7" strokeLinejoin="round">
        {RADAR_FLOOR.map((d) => <path key={d} d={d} />)}
      </g>
      <g fill="#4c555e">
        {RADAR_FLOOR.map((d) => <path key={d} d={d} />)}
      </g>
      <g fill="none" stroke="#5f6a74" strokeWidth="1.4" opacity=".7">
        <path d="M92 42 V152 M116 42 V152" /><path d="M44 60 V106 M74 60 V106" />
      </g>
      <g fill="var(--brand)" opacity=".18">
        <rect x="126" y="24" width="50" height="30" rx="3" /><rect x="24" y="30" width="42" height="28" rx="3" />
      </g>
      <g fill="#e9e2d6" opacity=".62" fontFamily="var(--font-geist-mono), ui-monospace, monospace" fontWeight="700" textAnchor="middle">
        <text x="151" y="47" fontSize="21">A</text>
        <text x="45" y="52" fontSize="21">B</text>
        <text x="104" y="112" fontSize="9" opacity=".8">MID</text>
      </g>
      {/* bomb on the ground at B */}
      <g transform="translate(52 66)">
        <circle r="4.4" fill="#f0c04a" stroke="#1b2024" strokeWidth="1.4" />
        <circle r="1.5" fill="#1b2024" />
      </g>
    </>
  );
}

export function RadarPreview({ state }: { state: ConfigState }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, "");
  const zoom = 0.5 + clamp(numberValue(state, "cl_radar_scale", 0.4), 0.25, 1) * 1.25;
  const iconR = 2.8 + clamp(numberValue(state, "cl_radar_icon_scale_min", 0.6), 0.4, 1.25) * 2.6;
  const rotate = Boolean(state.cl_radar_rotate);
  const centered = Boolean(state.cl_radar_always_centered);
  const hudScale = clamp(numberValue(state, "cl_hud_radar_scale", 1), 0.8, 1.3);
  const dynamic = Boolean(state.cl_radar_scale_dynamic);

  const R = 78;                       // radar radius in svg units
  const yaw = 34;                     // where "we" are looking
  const rot = rotate ? -yaw : 0;
  const self = { x: 104, y: 143 };    // our position in map coordinates
  const anchor = centered ? self : { x: 100, y: 104 };

  // Where the self marker lands once the map is anchored on its own centre.
  const rad = (rot * Math.PI) / 180;
  const dx = (self.x - anchor.x) * zoom;
  const dy = (self.y - anchor.y) * zoom;
  const selfX = R + dx * Math.cos(rad) - dy * Math.sin(rad);
  const selfY = R + dx * Math.sin(rad) + dy * Math.cos(rad);

  const mates = [
    { x: 104, y: 96 }, { x: 58, y: 112 }, { x: 138, y: 84 }, { x: 162, y: 40 },
  ].map((mate, index) => {
    const mx = (mate.x - anchor.x) * zoom;
    const my = (mate.y - anchor.y) * zoom;
    return {
      key: index,
      x: R + mx * Math.cos(rad) - my * Math.sin(rad),
      y: R + mx * Math.sin(rad) + my * Math.cos(rad),
    };
  });

  return (
    <div className="radar-stage" style={{ transform: `scale(${hudScale})` }}>
      <svg className="radar-svg" viewBox="0 0 156 156" role="img" aria-label={t("Radar-Vorschau")}>
        <defs>
          <clipPath id={`${id}-clip`}><circle cx={R} cy={R} r={R} /></clipPath>
          <radialGradient id={`${id}-fade`} cx="50%" cy="50%" r="50%">
            <stop offset="62%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".6" />
          </radialGradient>
        </defs>

        <g clipPath={`url(#${id}-clip)`}>
          <rect width="156" height="156" fill="#171c21" />
          <g className="radar-map" transform={`translate(${R} ${R}) rotate(${rot}) scale(${zoom}) translate(${-anchor.x} ${-anchor.y})`}>
            <RadarMap />
          </g>

          {mates.map((mate) => (
            <g className="radar-icon" key={mate.key} transform={`translate(${mate.x} ${mate.y})`}>
              <circle r={iconR} fill="#6ec7a0" stroke="#10151a" strokeWidth="1.6" />
            </g>
          ))}

          <g className="radar-icon" transform={`translate(${selfX} ${selfY}) rotate(${rotate ? 0 : yaw})`}>
            <path d={`M0 ${-iconR * 2.6} L${iconR * 1.7} ${iconR * 1.5} L0 ${iconR * 0.5} L${-iconR * 1.7} ${iconR * 1.5} Z`}
              fill="var(--brand)" stroke="#10151a" strokeWidth="1.4" strokeLinejoin="round" />
          </g>

          <rect width="156" height="156" fill={`url(#${id}-fade)`} />
        </g>

        <circle cx={R} cy={R} r={R - 1} fill="none" stroke="oklch(1 0 0 / 16%)" strokeWidth="2" />
        <g stroke="oklch(1 0 0 / 22%)" strokeWidth="2" strokeLinecap="round">
          <path d={`M${R} 3 v6`} /><path d={`M${R} ${156 - 9} v6`} />
          <path d={`M3 ${R} h6`} /><path d={`M${156 - 9} ${R} h6`} />
        </g>
      </svg>
      <span className="radar-label">{rotate ? "Mid · rotating" : "Mid · north up"}{dynamic ? " · auto zoom" : ""}</span>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Viewmodel — a first person frame with an actual rifle. The offsets move the
   weapon inside the SVG viewBox, so it can never drift out of the stage.
   -------------------------------------------------------------------------- */

function Rifle({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#454f55" /><stop offset="45%" stopColor="#2b3237" /><stop offset="100%" stopColor="#1b2023" />
        </linearGradient>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8d6135" /><stop offset="55%" stopColor="#6b4526" /><stop offset="100%" stopColor="#4a2e18" />
        </linearGradient>
        <linearGradient id={`${id}-glove`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a5158" /><stop offset="100%" stopColor="#252b30" />
        </linearGradient>
      </defs>

      {/* stock */}
      <path d="M-4 -9 L30 -7 L74 -1 L79 3 L79 13 L72 16 L44 13 L28 21 L15 21 L6 12 L-4 11 Z" fill={`url(#${id}-wood)`} />
      <path d="M4 -7 L60 0 L60 3 L4 -3 Z" fill="#a97a45" opacity=".45" />

      {/* barrel + gas tube */}
      <rect x="-136" y="-3.4" width="42" height="6.8" fill={`url(#${id}-metal)`} />
      <rect x="-101" y="-10" width="48" height="8" rx="2" fill={`url(#${id}-metal)`} />
      <path d="M-99 2 L-57 2 L-53 6 L-53 12 L-57 16 L-97 16 L-101 12 L-101 6 Z" fill={`url(#${id}-wood)`} />
      <path d="M-97 5 L-58 5 L-58 8 L-97 8 Z" fill="#a97a45" opacity=".4" />

      {/* muzzle brake */}
      <path d="M-152 -6 L-136 -6 L-136 6 L-152 6 Z" fill="#333b40" />
      <g fill="#12171a"><rect x="-149" y="-4" width="3" height="3" /><rect x="-143" y="-4" width="3" height="3" /></g>

      {/* gas block + front sight */}
      <path d="M-128 -4 L-118 -4 L-118 -14 L-124 -14 L-124 -10 L-128 -10 Z" fill="#39434a" />
      <rect x="-124" y="-19" width="4" height="6" fill="#39434a" />

      {/* receiver */}
      <path d="M-55 -9 L-4 -9 L-4 12 L-16 12 L-22 8 L-55 8 Z" fill={`url(#${id}-metal)`} />
      <rect x="-46" y="-12" width="38" height="4" rx="1.5" fill="#3d474e" />
      <rect x="-52" y="-16" width="12" height="5" rx="1.5" fill="#39434a" />
      <circle cx="-33" cy="-1" r="3" fill="#151a1d" />
      <path d="M-26 -3 L-14 -3 L-14 2 L-26 2 Z" fill="#4d585f" opacity=".7" />

      {/* magazine */}
      <path d="M-46 8 C-50 26, -58 36, -70 46 L-82 41 C-70 32, -62 22, -60 8 Z" fill={`url(#${id}-metal)`} />
      <path d="M-49 12 C-53 27, -60 35, -70 43" fill="none" stroke="#59646b" strokeWidth="2" opacity=".55" />

      {/* trigger guard + grip */}
      <path d="M-20 12 L-6 12 L-6 20 L-18 20 Z" fill="#2a3135" />
      <path d="M-9 10 L6 10 L14 40 C15 47, 3 50, -1 43 L-8 20 Z" fill={`url(#${id}-metal)`} />

      {/* hands */}
      <g fill={`url(#${id}-glove)`} stroke="#171c20" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M-6 14 C6 12, 18 20, 20 32 C22 44, 12 52, 1 49 C-8 46, -12 36, -12 26 Z" />
        <path d="M-92 -2 C-80 -6, -66 -2, -62 8 C-58 19, -66 28, -78 27 C-90 26, -98 18, -97 8 Z" />
      </g>
      <g stroke="#161b1f" strokeWidth="1.3" opacity=".8" fill="none">
        <path d="M-2 18 C6 18, 12 24, 13 31" /><path d="M-4 26 C4 26, 10 31, 11 38" />
        <path d="M-88 2 C-79 -1, -70 2, -67 9" /><path d="M-89 11 C-80 8, -72 11, -69 17" />
      </g>
    </g>
  );
}


function ViewmodelScene({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0cda3" /><stop offset="100%" stopColor="#a58f68" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b3225" /><stop offset="100%" stopColor="#6b5b40" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d5c41" /><stop offset="100%" stopColor="#463a29" />
        </linearGradient>
        <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3d0" /><stop offset="100%" stopColor="#d8bb84" />
        </linearGradient>
        <radialGradient id={`${id}-vig`} cx="50%" cy="46%" r="72%">
          <stop offset="48%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".62" />
        </radialGradient>
      </defs>

      {/* back wall with a lit doorway */}
      <rect width="320" height="180" fill="#57492f" />
      <rect x="86" y="30" width="148" height="122" fill={`url(#${id}-far)`} />
      <path d="M132 56 H196 V152 H132 Z" fill={`url(#${id}-glow)`} />
      <path d="M132 56 H196 V152 H132 Z" fill="none" stroke="#8a7247" strokeWidth="3" />
      <g fill="#00000012">
        <rect x="86" y="30" width="148" height="4" /><rect x="86" y="76" width="46" height="4" /><rect x="196" y="96" width="38" height="4" />
      </g>
      {/* distant player in the doorway */}
      <g fill="#4d4331" opacity=".8" transform="translate(164 92)">
        <circle cx="0" cy="0" r="7" /><path d="M-8 8 h16 l4 26 h-24Z" /><path d="M5 34 h7 l1 18h-7Z" /><path d="M-12 34 h7 l-1 18h-7Z" />
      </g>

      {/* ceiling + side walls in perspective */}
      <path d="M0 0 H320 L234 28 L86 28 Z" fill="#3a3021" />
      <path d="M0 0 L86 28 L86 152 L0 180 Z" fill={`url(#${id}-side)`} />
      <path d="M320 0 L234 28 L234 152 L320 180 Z" fill={`url(#${id}-side)`} transform="translate(320 0) scale(-1 1) translate(-320 0)" />
      <path d="M0 180 L86 152 H234 L320 180 Z" fill={`url(#${id}-floor)`} />
      <g stroke="#00000030" strokeWidth="2" fill="none">
        <path d="M0 46 L86 60 M0 116 L86 116" /><path d="M320 46 L234 60 M320 116 L234 116" />
      </g>

      {/* crates by the doorway */}
      <g>
        <path d="M92 108 L126 104 L126 146 L92 152 Z" fill="#7b6340" />
        <path d="M92 108 L74 111 L74 150 L92 152 Z" fill="#5d4c31" />
        <path d="M74 111 L92 108 L126 104 L108 101 Z" fill="#8f7449" />
      </g>

      <rect width="320" height="180" fill={`url(#${id}-vig)`} />
    </g>
  );
}

export function ViewmodelPreview({ state }: { state: ConfigState }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, "");
  const x = clamp(numberValue(state, "viewmodel_offset_x", 2.5), -2.5, 2.5);
  const y = clamp(numberValue(state, "viewmodel_offset_y", 0), -2, 2);
  const z = clamp(numberValue(state, "viewmodel_offset_z", -1.5), -2, 2);
  const fov = clamp(numberValue(state, "viewmodel_fov", 68), 54, 68);
  const left = Boolean(state.cl_prefer_lefthanded);

  // The grip sits bottom right at the stock defaults; the offsets move it from
  // there. A lower FOV pulls the weapon closer, so it grows and rises a little.
  const zoom = (1 + (68 - fov) * 0.017) * (1 + y * 0.05);
  const gripX = 244 + (x - 2.5) * 11;
  const gripY = 128 - (z + 1.5) * 11 - (68 - fov) * 0.7;
  // Left handed mirrors the whole weapon across the middle of the frame.
  const mirror = left ? "translate(320 0) scale(-1 1) " : "";
  const weapon = `${mirror}translate(${gripX} ${gripY}) rotate(24) scale(${zoom})`;

  return (
    <div className="viewmodel-stage">
      <svg className="scene" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={t("Viewmodel-Vorschau")}>
        <ViewmodelScene id={id} />

        {/* the crosshair sells the first person framing */}
        <g stroke="#7dff9b" strokeWidth="1.6" opacity=".85" strokeLinecap="round">
          <path d="M160 80 v-7 M160 100 v7 M150 90 h-7 M170 90 h7" />
        </g>

        <g className="viewmodel-weapon" transform={weapon}>
          <Rifle id={id} />
        </g>
      </svg>
      <span className="viewmodel-tag">FOV {fov}</span>
      <span className="viewmodel-hand">{left ? "LEFT" : "RIGHT"}</span>
    </div>
  );
}
