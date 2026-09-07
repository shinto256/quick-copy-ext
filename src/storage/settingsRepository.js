import { getItem, setItem } from "./storageClient.js";
import { ValidationError } from "./errors.js";

const KEY = "settings";
const DEFAULT_SETTINGS = { maskEnabled: true, theme: "auto", language: "ja" };
const VALID_THEMES = ["auto", "light", "dark"];
const VALID_LANGUAGES = ["ja", "en"];

export async function get() {
  const stored = await getItem(KEY, DEFAULT_SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  // 本feature導入前のデータ・不正なストレージ編集への防御。保存データ自体は書き換えない。
  if (!VALID_LANGUAGES.includes(merged.language)) {
    merged.language = "ja";
  }
  return merged;
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

export async function setLanguage(language) {
  if (!VALID_LANGUAGES.includes(language)) {
    throw new ValidationError("language", `language must be one of ${VALID_LANGUAGES.join(", ")}`);
  }
  const current = await get();
  await setItem(KEY, { ...current, language });
}
