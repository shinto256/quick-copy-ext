// t(key, params) / setLanguage / getLanguage / applyStaticTranslations。
// 辞書の値は文字列（{token}プレースホルダーを展開）または関数（paramsを渡して呼ぶ。
// 英語の単数・複数分岐に使う）のいずれか。キー欠落時は例外を投げずキー文字列を返す
// （翻訳漏れ1件で画面全体が描画エラーで止まる事故を避けるため）。

import ja from "./ja.js";
import en from "./en.js";

const DICTIONARIES = { ja, en };
const VALID_LANGUAGES = ["ja", "en"];

let currentLanguage = "ja";

export function setLanguage(lang) {
  currentLanguage = VALID_LANGUAGES.includes(lang) ? lang : "ja";
}

export function getLanguage() {
  return currentLanguage;
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, token) =>
    Object.prototype.hasOwnProperty.call(params, token) ? params[token] : match,
  );
}

export function t(key, params = {}) {
  const entry = DICTIONARIES[currentLanguage][key];
  if (entry === undefined) {
    return key;
  }
  if (typeof entry === "function") {
    return entry(params);
  }
  return interpolate(entry, params);
}

const FOCUSABLE_TARGETS = [
  ["data-i18n-text", "textContent"],
  ["data-i18n-placeholder", "placeholder"],
  ["data-i18n-aria-label", "aria-label"],
  ["data-i18n-title", "title"],
];

export function applyStaticTranslations(root = document) {
  for (const [attr, target] of FOCUSABLE_TARGETS) {
    const elements = root.querySelectorAll(`[${attr}]`);
    for (const el of elements) {
      const value = t(el.getAttribute(attr));
      if (target === "textContent" || target === "placeholder") {
        el[target] = value;
      } else {
        el.setAttribute(target, value);
      }
    }
  }
}
