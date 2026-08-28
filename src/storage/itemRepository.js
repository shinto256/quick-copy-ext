import { getItem, setItem } from "./storageClient.js";
import { ValidationError, NotFoundError } from "./errors.js";

const KEY = "items";
const MAX_ITEMS = 500;
const NAME_MAX_LENGTH = 50;
const VALUE_MAX_LENGTH = 2000;

function validate(name, value) {
  if (!name || name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new ValidationError("name", `name must be 1-${NAME_MAX_LENGTH} characters`);
  }
  if (!value || value.length < 1 || value.length > VALUE_MAX_LENGTH) {
    throw new ValidationError("value", `value must be 1-${VALUE_MAX_LENGTH} characters`);
  }
}

export async function list() {
  return getItem(KEY, []);
}

export async function create({ name, value, groupId = null }) {
  validate(name, value);
  const items = await list();
  if (items.length >= MAX_ITEMS) {
    throw new ValidationError("limit", `cannot exceed ${MAX_ITEMS} items`);
  }
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    name,
    value,
    groupId,
    createdAt: now,
    updatedAt: now,
  };
  await setItem(KEY, [...items, item]);
  return item;
}

export async function update(id, patch) {
  const items = await list();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new NotFoundError(id);
  }
  const current = items[index];
  const name = patch.name ?? current.name;
  const value = patch.value ?? current.value;
  if (patch.name !== undefined || patch.value !== undefined) {
    validate(name, value);
  }
  const groupChanged = patch.groupId !== undefined && patch.groupId !== current.groupId;
  const updated = {
    ...current,
    name,
    value,
    groupId: patch.groupId !== undefined ? patch.groupId : current.groupId,
    updatedAt: new Date().toISOString(),
  };

  const nextItems = [...items];
  if (groupChanged) {
    // グループ変更時は変更後のグループの末尾に配置する(FR-005)。
    nextItems.splice(index, 1);
    nextItems.push(updated);
  } else {
    nextItems[index] = updated;
  }
  await setItem(KEY, nextItems);
  return updated;
}

export async function remove(id) {
  const items = await list();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new NotFoundError(id);
  }
  const nextItems = [...items];
  nextItems.splice(index, 1);
  await setItem(KEY, nextItems);
}

export async function removeMany(ids) {
  const idsToRemove = new Set(ids);
  const items = await list();
  const nextItems = items.filter((item) => !idsToRemove.has(item.id));
  if (nextItems.length !== items.length) {
    await setItem(KEY, nextItems);
  }
}

export async function removeByGroup(groupId) {
  const items = await list();
  const idsToRemove = items.filter((item) => item.groupId === groupId).map((item) => item.id);
  await removeMany(idsToRemove);
}

export async function reorderGroup(groupId, orderedIds) {
  const items = await list();
  const currentIds = items.filter((item) => item.groupId === groupId).map((item) => item.id);
  const currentIdSet = new Set(currentIds);
  const isValid =
    orderedIds.length === currentIds.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => currentIdSet.has(id));
  if (!isValid) {
    throw new ValidationError(
      "orderedIds",
      "orderedIds must exactly match the items currently in the group",
    );
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const queue = [...orderedIds];
  const nextItems = items.map((item) =>
    item.groupId === groupId ? itemsById.get(queue.shift()) : item,
  );
  await setItem(KEY, nextItems);
  return nextItems;
}
