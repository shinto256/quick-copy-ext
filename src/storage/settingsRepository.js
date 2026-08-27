import { getItem, setItem } from "./storageClient.js";

const KEY = "settings";
const DEFAULT_SETTINGS = { maskEnabled: true };

export async function get() {
  return getItem(KEY, DEFAULT_SETTINGS);
}

export async function setMaskEnabled(value) {
  const current = await get();
  await setItem(KEY, { ...current, maskEnabled: value });
}
