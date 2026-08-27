export async function getItem(key, defaultValue) {
  const result = await chrome.storage.local.get(key);
  return Object.prototype.hasOwnProperty.call(result, key) ? result[key] : defaultValue;
}

export async function setItem(key, value) {
  await chrome.storage.local.set({ [key]: value });
}
