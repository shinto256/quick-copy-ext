import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as GroupRepository from "../../src/storage/groupRepository.js";
import * as ItemRepository from "../../src/storage/itemRepository.js";
import { ValidationError } from "../../src/storage/errors.js";

beforeEach(() => {
  installChromeStorageMock();
});

describe("GroupRepository.create - boundary validation (T022)", () => {
  it("rejects empty name", async () => {
    await expect(GroupRepository.create("")).rejects.toThrow(ValidationError);
  });

  it("accepts name of exactly 30 characters", async () => {
    const name = "g".repeat(30);
    const group = await GroupRepository.create(name);
    expect(group.name).toBe(name);
  });

  it("rejects name of 31 characters", async () => {
    await expect(GroupRepository.create("g".repeat(31))).rejects.toThrow(ValidationError);
  });

  it("allows the 50th group and rejects the 51st", async () => {
    for (let i = 0; i < 49; i++) {
      await GroupRepository.create(`g${i}`);
    }
    expect(await GroupRepository.list()).toHaveLength(49);

    await GroupRepository.create("g49");
    expect(await GroupRepository.list()).toHaveLength(50);

    await expect(GroupRepository.create("g50")).rejects.toThrow(ValidationError);
    expect(await GroupRepository.list()).toHaveLength(50);
  });
});

describe("GroupRepository.delete - reassigns items to unassigned (T023)", () => {
  it("sets groupId to null for all items that belonged to the deleted group", async () => {
    const group = await GroupRepository.create("英語住所");
    const itemA = await ItemRepository.create({
      name: "住所A",
      value: "v",
      groupId: group.id,
    });
    const itemB = await ItemRepository.create({
      name: "住所B",
      value: "v",
      groupId: group.id,
    });
    const other = await ItemRepository.create({ name: "その他", value: "v" });

    await GroupRepository.remove(group.id);

    const items = await ItemRepository.list();
    expect(items.find((i) => i.id === itemA.id).groupId).toBeNull();
    expect(items.find((i) => i.id === itemB.id).groupId).toBeNull();
    expect(items.find((i) => i.id === other.id).groupId).toBeNull();
    expect(await GroupRepository.list()).toHaveLength(0);
  });
});
