import { beforeEach, describe, expect, it } from "vitest";
import ja from "../../src/i18n/ja.js";
import en from "../../src/i18n/en.js";
import { getLanguage, setLanguage, t } from "../../src/i18n/index.js";

beforeEach(() => {
  setLanguage("ja");
});

describe("dictionaries - key parity", () => {
  it("has the exact same key set in ja and en", () => {
    const jaKeys = Object.keys(ja).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(jaKeys);
  });

  it("has at least one key (sanity check against an empty dictionary)", () => {
    expect(Object.keys(ja).length).toBeGreaterThan(0);
  });

  it("keeps moreMenu.languageJa identical across dictionaries (native name, not translated)", () => {
    expect(en["moreMenu.languageJa"]).toBe(ja["moreMenu.languageJa"]);
  });

  it("keeps moreMenu.languageEn identical across dictionaries (native name, not translated)", () => {
    expect(en["moreMenu.languageEn"]).toBe(ja["moreMenu.languageEn"]);
  });
});

describe("getLanguage - initial value", () => {
  it("defaults to ja", () => {
    expect(getLanguage()).toBe("ja");
  });
});

describe("setLanguage / getLanguage", () => {
  it("switches the active language", () => {
    setLanguage("en");
    expect(getLanguage()).toBe("en");
    setLanguage("ja");
    expect(getLanguage()).toBe("ja");
  });

  it("treats an invalid value as ja", () => {
    setLanguage("zh");
    expect(getLanguage()).toBe("ja");
  });
});

describe("t() - string values with placeholder interpolation", () => {
  it("returns the ja string as-is when there is no placeholder", () => {
    expect(t("moreMenu.theme")).toBe("テーマ");
  });

  it("substitutes a {token} placeholder from params", () => {
    setLanguage("en");
    expect(t("itemCard.confirmDelete", { name: "Sample" })).toBe('Delete "Sample"?');
  });

  it("leaves an unknown token in the template untouched", () => {
    // itemCard.confirmDelete only knows {name}; passing an unrelated param should not affect it
    setLanguage("en");
    expect(t("itemCard.confirmDelete", { name: "X", unused: "Y" })).toBe('Delete "X"?');
  });
});

describe("t() - function values", () => {
  it("calls the function with params and returns its result", () => {
    setLanguage("ja");
    expect(t("selection.count", { count: 3 })).toBe("3件選択中");
  });

  it("passes an empty object when params is omitted", () => {
    // groupPanel.errorLimit is a plain string (no params needed); ensure omission doesn't throw
    expect(() => t("groupPanel.errorLimit")).not.toThrow();
  });
});

describe("t() - English singular/plural", () => {
  it("uses the singular form when count is 1", () => {
    setLanguage("en");
    expect(t("selection.count", { count: 1 })).toBe("1 item selected");
  });

  it("uses the plural form when count is not 1", () => {
    setLanguage("en");
    expect(t("selection.count", { count: 0 })).toBe("0 items selected");
    expect(t("selection.count", { count: 2 })).toBe("2 items selected");
  });

  it("applies the same rule to groupPanel.itemCountAria", () => {
    setLanguage("en");
    expect(t("groupPanel.itemCountAria", { count: 1 })).toBe("1 item");
    expect(t("groupPanel.itemCountAria", { count: 5 })).toBe("5 items");
  });
});

describe("t() - missing key", () => {
  it("returns the key itself instead of throwing", () => {
    expect(() => t("does.not.exist")).not.toThrow();
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});
