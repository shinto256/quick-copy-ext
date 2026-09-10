import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as SettingsRepository from "../../src/storage/settingsRepository.js";
import { ValidationError } from "../../src/storage/errors.js";

let store;

beforeEach(() => {
  store = installChromeStorageMock();
});

describe("SettingsRepository.get - default value (T013)", () => {
  it("returns maskEnabled: true and theme: auto when uninitialized", async () => {
    const settings = await SettingsRepository.get();
    expect(settings).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
  });
});

describe("SettingsRepository.setMaskEnabled (T019)", () => {
  it("persists the updated value and get() reflects it", async () => {
    await SettingsRepository.setMaskEnabled(false);
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: false,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });

    await SettingsRepository.setMaskEnabled(true);
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
  });
});

describe("SettingsRepository.setTheme (req-000006)", () => {
  it("persists the updated theme and get() reflects it", async () => {
    await SettingsRepository.setTheme("dark");
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "dark",
      language: "ja",
      selectedGroupId: null,
    });
  });

  it("treats theme as auto when settings were saved before theme existed", async () => {
    await SettingsRepository.setMaskEnabled(false);
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: false,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
  });

  it("rejects invalid theme values without changing the stored theme", async () => {
    await SettingsRepository.setTheme("dark");
    await expect(SettingsRepository.setTheme("blue")).rejects.toThrow(ValidationError);
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "dark",
      language: "ja",
      selectedGroupId: null,
    });
  });
});

describe("SettingsRepository.setLanguage (req-000015)", () => {
  it("persists the updated language and get() reflects it", async () => {
    await SettingsRepository.setLanguage("en");
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "en",
      selectedGroupId: null,
    });

    await SettingsRepository.setLanguage("ja");
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
  });

  it("rejects invalid language values without changing the stored language", async () => {
    await SettingsRepository.setLanguage("en");
    await expect(SettingsRepository.setLanguage("zh")).rejects.toThrow(ValidationError);
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "en",
      selectedGroupId: null,
    });
  });

  it("does not change theme or maskEnabled", async () => {
    await SettingsRepository.setTheme("dark");
    await SettingsRepository.setMaskEnabled(false);
    await SettingsRepository.setLanguage("en");
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: false,
      theme: "dark",
      language: "en",
      selectedGroupId: null,
    });
  });

  it("falls back to ja when settings were saved before language existed", async () => {
    await SettingsRepository.setTheme("dark");
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "dark",
      language: "ja",
      selectedGroupId: null,
    });
  });

  it("rounds an invalid stored language value down to ja on read without rewriting storage", async () => {
    // ストレージへ直接不正値を書き込んだ状態（手動編集や将来の破損データを模す）。
    store.settings = { maskEnabled: true, theme: "auto", language: "zh" };

    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
    // 保存データ自体は書き換えない（読み出し時にのみ丸める）。
    expect(store.settings.language).toBe("zh");
  });
});

describe("SettingsRepository.setSelectedGroupId (req-000016)", () => {
  it("returns selectedGroupId: null by default", async () => {
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
  });

  it("persists the updated selectedGroupId and get() reflects it", async () => {
    await SettingsRepository.setSelectedGroupId("group-1");
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "ja",
      selectedGroupId: "group-1",
    });
  });

  it("can be reset back to null", async () => {
    await SettingsRepository.setSelectedGroupId("group-1");
    await SettingsRepository.setSelectedGroupId(null);
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: true,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
  });

  it("does not change maskEnabled, theme, or language", async () => {
    await SettingsRepository.setMaskEnabled(false);
    await SettingsRepository.setTheme("dark");
    await SettingsRepository.setLanguage("en");
    await SettingsRepository.setSelectedGroupId("group-1");
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: false,
      theme: "dark",
      language: "en",
      selectedGroupId: "group-1",
    });
  });

  it("treats selectedGroupId as null when settings were saved before it existed", async () => {
    await SettingsRepository.setMaskEnabled(false);
    expect(await SettingsRepository.get()).toEqual({
      maskEnabled: false,
      theme: "auto",
      language: "ja",
      selectedGroupId: null,
    });
  });
});
