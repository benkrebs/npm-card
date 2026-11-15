import { mdiArrowDecision, mdiLanConnect, mdiWeb, mdiWebOff } from "@mdi/js";
import type { HostState, HostType } from "./types";

export const TYPE_ICONS: Record<HostType, string> = {
  proxy: mdiWeb,
  redirect: mdiArrowDecision,
  stream: mdiLanConnect,
  dead: mdiWebOff,
};

export const DEFAULT_STATE_COLORS: Record<HostState, string> = {
  enabled: "var(--success-color, #43a047)",
  disabled: "var(--disabled-color, #9e9e9e)",
  unavailable: "var(--error-color, #db4437)",
};

export const CERT_COLORS = {
  ok: "var(--secondary-text-color)",
  warning: "var(--warning-color, #ffa600)",
  expired: "var(--error-color, #db4437)",
} as const;

/** Color names offered by Home Assistant's `ui_color` selector; they map to theme variables. */
const THEME_COLORS: Record<string, true> = Object.fromEntries(
  [
    "primary", "accent", "red", "pink", "purple", "deep-purple", "indigo", "blue", "light-blue", "cyan",
    "teal", "green", "light-green", "lime", "yellow", "amber", "orange", "deep-orange", "brown",
    "light-grey", "grey", "dark-grey", "blue-grey", "black", "white", "disabled", "success", "warning",
    "error", "info",
  ].map((name) => [name, true]),
);

/** Accepts a theme color name (`red`, `deep-orange`, …) or any CSS color (`#ff0000`, `rgb(…)`, `var(--x)`). */
export function resolveColor(value: string | undefined, fallback: string): string {
  if (!value || value === "state" || value === "none") return fallback;
  return THEME_COLORS[value] ? `var(--${value}-color)` : value;
}
