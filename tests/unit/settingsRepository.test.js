import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as SettingsRepository from "../../src/storage/settingsRepository.js";
import { ValidationError } from "../../src/storage/errors.js";

beforeEach(() => {
  installChromeStorageMock();
});

describe("SettingsRepository.get - default value (T013)", () => {
  it("returns maskEnabled: true and theme: auto when uninitialized", async () => {
    const settings = await SettingsRepository.get();
    expect(settings).toEqual({ maskEnabled: true, theme: "auto" });
  });
});

describe("SettingsRepository.setMaskEnabled (T019)", () => {
  it("persists the updated value and get() reflects it", async () => {
    await SettingsRepository.setMaskEnabled(false);
    expect(await SettingsRepository.get()).toEqual({ maskEnabled: false, theme: "auto" });

    await SettingsRepository.setMaskEnabled(true);
    expect(await SettingsRepository.get()).toEqual({ maskEnabled: true, theme: "auto" });
  });
});

describe("SettingsRepository.setTheme (req-000006)", () => {
  it("persists the updated theme and get() reflects it", async () => {
    await SettingsRepository.setTheme("dark");
    expect(await SettingsRepository.get()).toEqual({ maskEnabled: true, theme: "dark" });
  });

  it("treats theme as auto when settings were saved before theme existed", async () => {
    await SettingsRepository.setMaskEnabled(false);
    expect(await SettingsRepository.get()).toEqual({ maskEnabled: false, theme: "auto" });
  });

  it("rejects invalid theme values without changing the stored theme", async () => {
    await SettingsRepository.setTheme("dark");
    await expect(SettingsRepository.setTheme("blue")).rejects.toThrow(ValidationError);
    expect(await SettingsRepository.get()).toEqual({ maskEnabled: true, theme: "dark" });
  });
});
