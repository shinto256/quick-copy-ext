import { getItem, setItem } from "./storageClient.js";
import { ValidationError, NotFoundError } from "./errors.js";
import { reassignGroup } from "./itemRepository.js";

const KEY = "groups";
const MAX_GROUPS = 50;
const NAME_MAX_LENGTH = 30;

function validateName(name) {
  if (!name || name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new ValidationError("name", `name must be 1-${NAME_MAX_LENGTH} characters`);
  }
}

export async function list() {
  return getItem(KEY, []);
}

export async function create(name) {
  validateName(name);
  const groups = await list();
  if (groups.length >= MAX_GROUPS) {
    throw new ValidationError("limit", `cannot exceed ${MAX_GROUPS} groups`);
  }
  const group = { id: crypto.randomUUID(), name };
  await setItem(KEY, [...groups, group]);
  return group;
}

export async function rename(id, name) {
  validateName(name);
  const groups = await list();
  const index = groups.findIndex((group) => group.id === id);
  if (index === -1) {
    throw new NotFoundError(id);
  }
  const updated = { ...groups[index], name };
  const nextGroups = [...groups];
  nextGroups[index] = updated;
  await setItem(KEY, nextGroups);
  return updated;
}

export async function remove(id) {
  const groups = await list();
  const index = groups.findIndex((group) => group.id === id);
  if (index === -1) {
    throw new NotFoundError(id);
  }
  await reassignGroup(id, null);
  const nextGroups = [...groups];
  nextGroups.splice(index, 1);
  await setItem(KEY, nextGroups);
}
