import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as SettingsRepository from "../../src/storage/settingsRepository.js";

beforeEach(() => {
  installChromeStorageMock();
});

describe("SettingsRepository.get - default value (T013)", () => {
  it("returns maskEnabled: true when uninitialized", async () => {
    const settings = await SettingsRepository.get();
    expect(settings).toEqual({ maskEnabled: true });
  });
});

describe("SettingsRepository.setMaskEnabled (T019)", () => {
  it("persists the updated value and get() reflects it", async () => {
    await SettingsRepository.setMaskEnabled(false);
    expect(await SettingsRepository.get()).toEqual({ maskEnabled: false });

    await SettingsRepository.setMaskEnabled(true);
    expect(await SettingsRepository.get()).toEqual({ maskEnabled: true });
  });
});
