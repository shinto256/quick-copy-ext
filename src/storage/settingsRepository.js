import { getItem, setItem } from "./storageClient.js";
import { ValidationError } from "./errors.js";

const KEY = "settings";
const DEFAULT_SETTINGS = { maskEnabled: true, theme: "auto" };
const VALID_THEMES = ["auto", "light", "dark"];

export async function get() {
  const stored = await getItem(KEY, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setMaskEnabled(value) {
  const current = await get();
  await setItem(KEY, { ...current, maskEnabled: value });
}

export async function setTheme(theme) {
  if (!VALID_THEMES.includes(theme)) {
    throw new ValidationError("theme", `theme must be one of ${VALID_THEMES.join(", ")}`);
  }
  const current = await get();
  await setItem(KEY, { ...current, theme });
}
