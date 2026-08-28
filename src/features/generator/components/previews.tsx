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

function Silhouette({ x, y, scale = 1, opacity = 1 }: { x: number; y: number; scale?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <circle cx="0" cy="-14" r="5.5" />
      <path d="M-4 -8 h8 l9 6 l3 20 l-4 1 l-2 -14 l1 20 h-16 l1 -20 l-2 14 l-4 -1 l3 -20Z" />
      <path d="M1 23 h7 l1 21 h-7Z" /><path d="M-9 23 h7 l-1 21 h-7Z" />
    </g>
  );
}

/* --------------------------------------------------------------------------
   Crosshair — a first person look down an A site, with the real crosshair
   drawn on top in screen pixels so length, gap and thickness stay honest.
   -------------------------------------------------------------------------- */

function CrosshairScene({ id }: { id: string }) {
  return (
    <svg className="preview-scene" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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

      {/* enemies, layered so the crates in front of them read as cover */}
      <g fill="#262d21"><Silhouette x={116} y={100} scale={0.5} opacity={0.75} /></g>
      <g>
        <path d="M118 114 L146 111 L146 138 L118 143 Z" fill="#7d6340" />
        <path d="M118 114 L98 117 L98 141 L118 143 Z" fill="#5f4b30" />
        <path d="M98 117 L118 114 L146 111 L126 109 Z" fill="#96794a" />
      </g>
      <g fill="#242b1f"><Silhouette x={174} y={76} scale={0.92} /></g>
      <g>
        <path d="M186 96 L232 92 L232 130 L186 138 Z" fill="#8a6d45" />
        <path d="M186 96 L162 100 L162 134 L186 138 Z" fill="#6b5334" />
        <path d="M162 100 L186 96 L232 92 L208 88 Z" fill="#a3854f" />
        <path d="M190 104 L228 100 L228 126 L190 132 Z" fill="none" stroke="#5c4527" strokeWidth="2.5" />
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

// Rooms are rectangles, links are stroked centre lines. Both are painted twice:
// once fat and dark for the outer wall, once on top in the floor tone, so the
// union reads as one map without any inner seams.
const RADAR_ROOMS = [
  { x: 118, y: 26, width: 52, height: 34 },   // A site
  { x: 30, y: 26, width: 50, height: 34 },    // B site
  { x: 76, y: 64, width: 22, height: 20 },    // window room
  { x: 130, y: 96, width: 44, height: 30 },   // CT spawn
  { x: 60, y: 144, width: 80, height: 30 },   // T spawn
  { x: 28, y: 88, width: 34, height: 28 },    // market
];

const RADAR_LINKS = [
  "M100 148 L106 128 L106 62 L126 46",   // T spawn · mid · ramp to A
  "M106 84 L142 84 L152 100",            // connector to CT
  "M160 60 L160 100",                    // palace
  "M52 60 L52 98",                       // apartments
  "M62 100 L106 100",                    // market to mid
  "M38 60 L38 92",                       // outside long
  "M42 114 L42 150 L62 158",             // market to T
  "M152 126 L152 158 L138 162",          // CT rotate
];

function RadarMap() {
  const rooms = RADAR_ROOMS.map((room) => <rect key={`${room.x}-${room.y}`} rx="3" {...room} />);
  const links = RADAR_LINKS.map((d) => <path key={d} d={d} />);
  return (
    <>
      <g stroke="#1d2429" strokeWidth="5" strokeLinejoin="round" fill="#1d2429">{rooms}</g>
      <g stroke="#1d2429" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" fill="none">{links}</g>
      <g fill="#555f68">{rooms}</g>
      <g stroke="#555f68" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none">{links}</g>

      {/* crates and cover inside the sites */}
      <g fill="#3c454c">
        <rect x="126" y="34" width="13" height="9" rx="2" /><rect x="150" y="46" width="15" height="9" rx="2" />
        <rect x="38" y="34" width="14" height="10" rx="2" /><rect x="62" y="46" width="13" height="9" rx="2" />
        <rect x="138" y="104" width="28" height="8" rx="2" />
      </g>

      <g fill="var(--brand)" opacity=".22">
        <rect x="122" y="30" width="44" height="26" rx="3" /><rect x="34" y="30" width="42" height="26" rx="3" />
      </g>
      <g fill="#efe8dc" opacity=".65" fontFamily="var(--font-geist-mono), ui-monospace, monospace" fontWeight="700" textAnchor="middle">
        <text x="144" y="51" fontSize="18">A</text>
        <text x="55" y="51" fontSize="18">B</text>
        <text x="88" y="112" fontSize="9" opacity=".7">MID</text>
      </g>

      {/* dropped bomb near B */}
      <g transform="translate(67 50)">
        <circle r="4.4" fill="#f0c04a" stroke="#151a1e" strokeWidth="1.4" />
        <circle r="1.5" fill="#151a1e" />
      </g>
    </>
  );
}

export function RadarPreview({ state }: { state: ConfigState }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, "");
  const zoom = 0.4 + clamp(numberValue(state, "cl_radar_scale", 0.4), 0.25, 1) * 0.78;
  const iconR = 2.8 + clamp(numberValue(state, "cl_radar_icon_scale_min", 0.6), 0.4, 1.25) * 2.6;
  const rotate = Boolean(state.cl_radar_rotate);
  const centered = Boolean(state.cl_radar_always_centered);
  const hudScale = clamp(numberValue(state, "cl_hud_radar_scale", 1), 0.8, 1.3);
  const dynamic = Boolean(state.cl_radar_scale_dynamic);

  const R = 78;                       // radar radius in svg units
  const yaw = 34;                     // where "we" are looking
  const rot = rotate ? -yaw : 0;
  const self = { x: 106, y: 122 };    // our position in map coordinates
  const anchor = centered ? self : { x: 101, y: 100 };

  // Where the self marker lands once the map is anchored on its own centre.
  const rad = (rot * Math.PI) / 180;
  const dx = (self.x - anchor.x) * zoom;
  const dy = (self.y - anchor.y) * zoom;
  const selfX = R + dx * Math.cos(rad) - dy * Math.sin(rad);
  const selfY = R + dx * Math.sin(rad) + dy * Math.cos(rad);

  const mates = [
    { x: 106, y: 96 }, { x: 52, y: 106 }, { x: 130, y: 84 }, { x: 161, y: 38 },
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
    <div className="radar-stage" style={{ "--hud": hudScale } as React.CSSProperties}>
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
      <span className="radar-label">Mid · {t(rotate ? "gedreht" : "Nord oben")}{dynamic ? ` · ${t("Auto-Zoom")}` : ""}</span>
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
          <stop offset="0%" stopColor="#4b555c" /><stop offset="42%" stopColor="#2c3439" /><stop offset="100%" stopColor="#181d21" />
        </linearGradient>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5631" /><stop offset="55%" stopColor="#5c3d22" /><stop offset="100%" stopColor="#3c2715" />
        </linearGradient>
        <linearGradient id={`${id}-glove`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#525b62" /><stop offset="100%" stopColor="#242a2f" />
        </linearGradient>
      </defs>

      {/* stock */}
      <path d="M-8 -10 L26 -8 L70 -2 L80 3 L80 13 L70 17 L44 14 L28 22 L14 22 L4 13 L-8 12 Z" fill={`url(#${id}-wood)`} />
      <path d="M2 -6 L64 1 L64 4 L2 -2 Z" fill="#a3773f" opacity=".35" />
      <path d="M18 14 L40 12 L28 20 L18 20 Z" fill="#241708" opacity=".55" />

      {/* barrel, gas tube, handguard */}
      <rect x="-138" y="-3.6" width="42" height="7.2" fill={`url(#${id}-metal)`} />
      <rect x="-108" y="-11" width="50" height="8.4" rx="2.5" fill={`url(#${id}-metal)`} />
      <path d="M-107 1.5 L-59 1.5 L-54 6 L-54 11.5 L-59 16 L-105 16 L-110 11.5 L-110 6 Z" fill={`url(#${id}-wood)`} />
      <path d="M-104 4.5 L-60 4.5 L-60 7.5 L-104 7.5 Z" fill="#a3773f" opacity=".3" />

      {/* muzzle brake */}
      <path d="M-154 -6.5 L-138 -6.5 L-138 6.5 L-154 6.5 Z" fill="#39434a" />
      <g fill="#101518"><rect x="-151" y="-4" width="3.5" height="3.5" /><rect x="-145" y="-4" width="3.5" height="3.5" /></g>

      {/* gas block and front sight */}
      <path d="M-120 -4 L-110 -4 L-110 -13 L-120 -13 Z" fill="#39434a" />
      <path d="M-132 -3.6 L-123 -3.6 L-123 -15 L-127 -15 L-127 -11 L-132 -11 Z" fill="#39434a" />
      <rect x="-128" y="-20" width="4" height="6" fill="#39434a" />

      {/* receiver */}
      <path d="M-57 -10 L-6 -10 L-6 13 L-18 13 L-24 9 L-57 9 Z" fill={`url(#${id}-metal)`} />
      <rect x="-48" y="-13.5" width="40" height="4.5" rx="1.5" fill="#414c53" />
      <rect x="-55" y="-18" width="14" height="5.5" rx="1.5" fill="#3a444b" />
      <circle cx="-34" cy="-1" r="3.2" fill="#12171a" />
      <path d="M-28 -4 L-14 -4 L-14 2 L-28 2 Z" fill="#586570" opacity=".55" />

      {/* banana magazine */}
      <path d="M-30 9 C-35 25, -45 38, -59 50 L-81 44 C-65 32, -55 22, -53 9 Z" fill={`url(#${id}-metal)`} />
      <path d="M-49 13 C-53 27, -62 38, -75 48" fill="none" stroke="#6d7a83" strokeWidth="2.4" opacity=".5" />
      <path d="M-59 50 L-81 44 L-78 39 L-56 45 Z" fill="#12171a" />

      {/* trigger guard and pistol grip */}
      <path d="M-22 13 L-8 13 L-8 21 L-20 21 Z" fill="#252c31" />
      <path d="M-12 11 L6 11 L17 42 C19 50, 5 54, 0 46 L-11 21 Z" fill={`url(#${id}-metal)`} />

      {/* hands */}
      <g stroke="#12171b" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M-14 12 C-3 7, 12 12, 17 24 C23 38, 15 51, 2 50 C-9 49, -16 41, -16 29 Z" fill={`url(#${id}-glove)`} />
        <path d="M-101 -8 C-89 -14, -73 -9, -69 3 C-65 16, -74 27, -86 26 C-98 25, -105 16, -104 5 Z" fill={`url(#${id}-glove)`} />
      </g>
      <g stroke="#141a1e" strokeWidth="1.5" opacity=".75" fill="none" strokeLinecap="round">
        <path d="M-6 15 C4 14, 12 20, 14 29" /><path d="M-9 24 C1 23, 9 28, 11 37" /><path d="M-11 33 C-2 32, 5 36, 7 44" />
        <path d="M-94 -5 C-85 -9, -75 -5, -72 4" /><path d="M-97 4 C-88 0, -79 4, -76 13" /><path d="M-98 13 C-90 10, -81 13, -79 21" />
      </g>
      <path d="M-14 12 C-6 6, 4 6, 9 12" fill="none" stroke="#12171b" strokeWidth="1.8" opacity=".6" />
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
      <g fill="#4a4030"><Silhouette x={163} y={88} opacity={0.85} /></g>

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
  const zoom = 0.62 * (1 + (68 - fov) * 0.019) * (1 + y * 0.05);
  const gripX = 254 + (x - 2.5) * 10;
  const gripY = 148 - (z + 1.5) * 10 - (68 - fov) * 0.6;
  // Left handed mirrors the whole weapon across the middle of the frame.
  const mirror = left ? "translate(320 0) scale(-1 1) " : "";
  const weapon = `${mirror}translate(${gripX} ${gripY}) rotate(24) scale(${zoom})`;

  return (
    <div className="viewmodel-stage">
      <svg className="preview-scene" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={t("Viewmodel-Vorschau")}>
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
