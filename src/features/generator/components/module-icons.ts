import {
  Braces,
  Copy,
  Crosshair,
  FlaskConical,
  Gauge,
  Gamepad2,
  Headphones,
  Keyboard,
  MousePointer2,
  PanelTop,
  Radar,
  Rocket,
  Server,
} from "lucide-react";
import type { GeneratorModuleId } from "../modules/registry";

export const generatorModuleIcons: Record<GeneratorModuleId, typeof Crosshair> = {
  mouse: MousePointer2,
  crosshair: Crosshair,
  viewmodel: Gamepad2,
  radar: Radar,
  audio: Headphones,
  hud: PanelTop,
  performance: Gauge,
  server: Server,
  practice: FlaskConical,
  "launch-options": Rocket,
  binds: Keyboard,
  "multi-binds": Copy,
  "custom-binds": Braces,
};
