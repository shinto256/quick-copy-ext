import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as ItemRepository from "../../src/storage/itemRepository.js";
import { ValidationError, NotFoundError } from "../../src/storage/errors.js";

beforeEach(() => {
  installChromeStorageMock();
});

describe("ItemRepository.create - boundary validation (T007)", () => {
  it("rejects empty name", async () => {
    await expect(ItemRepository.create({ name: "", value: "v" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("accepts name of exactly 50 characters", async () => {
    const name = "a".repeat(50);
    const item = await ItemRepository.create({ name, value: "v" });
    expect(item.name).toBe(name);
  });

  it("rejects name of 51 characters", async () => {
    const name = "a".repeat(51);
    await expect(ItemRepository.create({ name, value: "v" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects empty value", async () => {
    await expect(ItemRepository.create({ name: "n", value: "" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("accepts value of exactly 2000 characters, including newlines", async () => {
    const value = "line1\nline2\n" + "a".repeat(1988);
    expect(value.length).toBe(2000);
    const item = await ItemRepository.create({ name: "n", value });
    expect(item.value).toBe(value);
  });

  it("rejects value of 2001 characters", async () => {
    const value = "a".repeat(2001);
    await expect(ItemRepository.create({ name: "n", value })).rejects.toThrow(
      ValidationError,
    );
  });

  it("allows the 500th item and rejects the 501st", async () => {
    for (let i = 0; i < 499; i++) {
      await ItemRepository.create({ name: `n${i}`, value: "v" });
    }
    const items = await ItemRepository.list();
    expect(items).toHaveLength(499);

    const item500 = await ItemRepository.create({ name: "n499", value: "v" });
    expect(item500).toBeDefined();
    expect(await ItemRepository.list()).toHaveLength(500);

    await expect(ItemRepository.create({ name: "n500", value: "v" })).rejects.toThrow(
      ValidationError,
    );
    expect(await ItemRepository.list()).toHaveLength(500);
  });
});

describe("ItemRepository.update / remove (T008)", () => {
  it("updates name and value of an existing item", async () => {
    const created = await ItemRepository.create({ name: "住所", value: "東京都..." });
    const updated = await ItemRepository.update(created.id, {
      name: "自宅住所",
      value: "東京都新宿区...",
    });
    expect(updated.name).toBe("自宅住所");
    expect(updated.value).toBe("東京都新宿区...");
    expect(updated.id).toBe(created.id);
  });

  it("throws NotFoundError when updating a non-existent id", async () => {
    await expect(
      ItemRepository.update("no-such-id", { name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("removes an existing item", async () => {
    const created = await ItemRepository.create({ name: "住所", value: "東京都..." });
    await ItemRepository.remove(created.id);
    expect(await ItemRepository.list()).toHaveLength(0);
  });

  it("throws NotFoundError when removing a non-existent id", async () => {
    await expect(ItemRepository.remove("no-such-id")).rejects.toThrow(NotFoundError);
  });
});
