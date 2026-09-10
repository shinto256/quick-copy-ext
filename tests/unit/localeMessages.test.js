import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCALES_DIR = join(ROOT, "_locales");

// Chrome ウェブストアが定める説明の長さの上限(FR-009)。
const DESCRIPTION_MAX_LENGTH = 132;

// spec の Assumptions で確定した英語の説明文(SC-009)。
const EN_DESCRIPTION = "Copy your registered text snippets to the clipboard with a single click.";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const manifest = readJson(join(ROOT, "manifest.json"));

function listLocales() {
  if (!existsSync(LOCALES_DIR)) {
    return [];
  }
  return readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readMessages(locale) {
  return readJson(join(LOCALES_DIR, locale, "messages.json"));
}

function collectMessageKeys(value, keys = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/__MSG_([A-Za-z0-9_@]+)__/g)) {
      keys.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectMessageKeys(item, keys);
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectMessageKeys(item, keys);
    }
  }
  return keys;
}

describe("locale messages - 基盤の整合 (VR-001〜VR-006)", () => {
  it("_locales ディレクトリが存在し、ロケールを1つ以上持つ", () => {
    expect(existsSync(LOCALES_DIR)).toBe(true);
    expect(listLocales().length).toBeGreaterThan(0);
  });

  it("manifest の name と description が __MSG_*__ 参照である", () => {
    expect(manifest.name).toMatch(/^__MSG_[A-Za-z0-9_@]+__$/);
    expect(manifest.description).toMatch(/^__MSG_[A-Za-z0-9_@]+__$/);
  });

  it("VR-001: default_locale が定義され、対応する messages.json が存在する", () => {
    expect(manifest.default_locale).toBeTruthy();
    expect(existsSync(join(LOCALES_DIR, manifest.default_locale, "messages.json"))).toBe(true);
  });

  it("VR-002: manifest の全 __MSG_*__ 参照が全ロケールに定義されている", () => {
    const referenced = [...collectMessageKeys(manifest)];
    expect(referenced.length).toBeGreaterThan(0);
    for (const locale of listLocales()) {
      const messages = readMessages(locale);
      for (const key of referenced) {
        expect(Object.keys(messages), `${locale} に ${key} が必要`).toContain(key);
      }
    }
  });

  it("VR-003: 全ロケールのキー集合が一致する", () => {
    const locales = listLocales();
    const baseline = Object.keys(readMessages(locales[0])).sort();
    for (const locale of locales) {
      expect(Object.keys(readMessages(locale)).sort(), `${locale} のキー集合`).toEqual(baseline);
    }
  });

  it("VR-004: 全ロケールの extDescription が132文字以内である", () => {
    for (const locale of listLocales()) {
      const description = readMessages(locale).extDescription.message;
      expect(description.length, `${locale} の説明の長さ`).toBeLessThanOrEqual(
        DESCRIPTION_MAX_LENGTH,
      );
    }
  });

  it("VR-005: 全ロケールの extName が同一である", () => {
    const names = listLocales().map((locale) => readMessages(locale).extName.message);
    expect(new Set(names).size).toBe(1);
  });

  it("VR-006: 全ロケールの全メッセージが非空の message を持つ", () => {
    for (const locale of listLocales()) {
      const messages = readMessages(locale);
      for (const [key, entry] of Object.entries(messages)) {
        expect(typeof entry.message, `${locale}/${key} の message の型`).toBe("string");
        expect(entry.message.length, `${locale}/${key} の message の長さ`).toBeGreaterThan(0);
      }
    }
  });
});

describe("locale messages - 英語ロケール (VR-007)", () => {
  it("_locales/en/messages.json が存在する", () => {
    expect(existsSync(join(LOCALES_DIR, "en", "messages.json"))).toBe(true);
  });

  it("VR-007: en の extDescription が spec に定めた文言と完全に一致する", () => {
    expect(readMessages("en").extDescription.message).toBe(EN_DESCRIPTION);
  });
});
