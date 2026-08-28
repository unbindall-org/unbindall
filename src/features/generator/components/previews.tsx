"use client";

import type { ConfigState } from "../catalog/commands";
import { useTranslation } from "react-i18next";

function numberValue(state: ConfigState, key: string, fallback: number) {
  const value = Number(state[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function CrosshairPreview({ state, compact = false }: { state: ConfigState; compact?: boolean }) {
  const { t } = useTranslation();
  const size = numberValue(state, "cl_crosshairsize", 2.5) * (compact ? 2.6 : 3.2);
  const gap = (numberValue(state, "cl_crosshairgap", -2) + 5) * 1.3 + 2;
  const thickness = Math.max(numberValue(state, "cl_crosshairthickness", 0.5) * 1.5, 1);
  const alpha = state.cl_crosshairusealpha === false ? 1 : numberValue(state, "cl_crosshairalpha", 255) / 255;
  const colorMode = numberValue(state, "cl_crosshaircolor", 1);
  const colors = ["#ff4141", "#55ff75", "#ffe75c", "#62a8ff", "#35f2e7"];
  const color = colorMode === 5
    ? `rgb(${numberValue(state, "cl_crosshaircolor_r", 80)}, ${numberValue(state, "cl_crosshaircolor_g", 255)}, ${numberValue(state, "cl_crosshaircolor_b", 120)})`
    : colors[colorMode] ?? colors[1];
  const outline = Boolean(state.cl_crosshair_drawoutline);
  const shadow = outline ? "0 0 0 1px rgba(0,0,0,.9)" : "none";
  const common = { background: color, opacity: alpha, boxShadow: shadow };

  return (
    <div className={`crosshair-preview ${compact ? "is-compact" : ""}`} aria-label={t("Crosshair-Vorschau")}>
      <div className="crosshair-scene">
        <span className="target target-a" />
        <span className="target target-b" />
        <div className="crosshair" style={{ "--gap": `${gap}px`, "--size": `${size}px`, "--thickness": `${thickness}px` } as React.CSSProperties}>
          {!state.cl_crosshair_t && <i className="crosshair-line top" style={common} />}
          <i className="crosshair-line right" style={common} />
          <i className="crosshair-line bottom" style={common} />
          <i className="crosshair-line left" style={common} />
          {Boolean(state.cl_crosshairdot) && <i className="crosshair-dot" style={{ ...common, width: thickness + 1, height: thickness + 1 }} />}
        </div>
      </div>
      {!compact && <div className="preview-caption"><span>LIVE</span> Mirage · A Site</div>}
    </div>
  );
}

export function RadarPreview({ state }: { state: ConfigState }) {
  const zoom = 0.72 + numberValue(state, "cl_radar_scale", 0.4) * 0.7;
  const icon = 5 + numberValue(state, "cl_radar_icon_scale_min", 0.6) * 5;
  const rotate = Boolean(state.cl_radar_rotate);
  const scale = numberValue(state, "cl_hud_radar_scale", 1);

  return (
    <div className="radar-stage" style={{ transform: `scale(${Math.min(scale, 1.2)})` }}>
      <div className="radar-clip">
        <div className="radar-map" style={{ transform: `scale(${zoom}) rotate(${rotate ? "-18deg" : "0deg"})` }}>
          <span className="radar-route route-a" /><span className="radar-route route-b" /><span className="radar-route route-c" />
          <span className="site-letter site-a">A</span><span className="site-letter site-b">B</span>
          <i className="radar-player p1" style={{ width: icon, height: icon }} />
          <i className="radar-player p2" style={{ width: icon, height: icon }} />
          <i className="radar-player p3" style={{ width: icon, height: icon }} />
        </div>
        <span className="radar-self" />
      </div>
      <span className="radar-label">T Start</span>
    </div>
  );
}

export function ViewmodelPreview({ state }: { state: ConfigState }) {
  const { t } = useTranslation();
  const x = numberValue(state, "viewmodel_offset_x", 2.5);
  const y = numberValue(state, "viewmodel_offset_y", 0);
  const z = numberValue(state, "viewmodel_offset_z", -1.5);
  const fov = numberValue(state, "viewmodel_fov", 68);
  const left = Boolean(state.cl_prefer_lefthanded);
  const style = {
    transform: `translate(${x * 8}px, ${-z * 6 - y * 4}px) scale(${0.9 + (68 - fov) * 0.012}) ${left ? "scaleX(-1)" : ""}`,
  };

  return (
    <div className="viewmodel-stage">
      <div className="viewmodel-world"><span /><span /><span /></div>
      <svg className="viewmodel-weapon" style={style} viewBox="0 0 270 150" aria-label={t("Viewmodel-Vorschau")}>
        <path d="M255 27 173 44l-48 33 14 21 61-19 54-31Z" fill="#2c3438" stroke="#69757a" strokeWidth="3" />
        <path d="m173 44-23-18-73 19 48 32Z" fill="#394246" stroke="#69757a" strokeWidth="3" />
        <path d="m133 85-31 8-8 40 24 9 25-47Z" fill="#242b2f" stroke="#69757a" strokeWidth="3" />
        <path d="m83 47-45 30 20 22 68-23Z" fill="#30393d" stroke="#69757a" strokeWidth="3" />
        <path d="m91 105-49 15-24 30h102l-2-9Z" fill="#5c4438" />
        <path d="m174 44 14-17 53-11 14 11Z" fill="#1d2326" />
        <circle cx="152" cy="68" r="8" fill="#93f0c1" opacity=".7" />
      </svg>
      <span className="viewmodel-tag">FOV {fov}</span>
    </div>
  );
}
