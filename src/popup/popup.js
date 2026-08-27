import * as ItemRepository from "../storage/itemRepository.js";
import * as SettingsRepository from "../storage/settingsRepository.js";
import * as GroupRepository from "../storage/groupRepository.js";
import { formatDisplayValue } from "./maskDisplay.js";

const listEl = document.getElementById("item-list");
const emptyStateEl = document.getElementById("empty-state");
const copyStatusEl = document.getElementById("copy-status");
const maskToggleEl = document.getElementById("mask-toggle");
const groupFilterEl = document.getElementById("group-filter");

let copyStatusTimer = null;

function showCopyStatus(message) {
  copyStatusEl.textContent = message;
  if (copyStatusTimer) {
    clearTimeout(copyStatusTimer);
  }
  copyStatusTimer = setTimeout(() => {
    copyStatusEl.textContent = "";
  }, 2000);
}

async function copyValue(value) {
  try {
    await navigator.clipboard.writeText(value);
    showCopyStatus("コピーしました");
  } catch (error) {
    showCopyStatus("コピーに失敗しました");
  }
}

function populateGroupFilter(groups) {
  const selected = groupFilterEl.value;
  groupFilterEl.innerHTML =
    '<option value="">すべて表示</option><option value="__unassigned__">未分類</option>';
  for (const group of groups) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupFilterEl.appendChild(option);
  }
  groupFilterEl.value = selected;
}

function filterItems(items, filterValue) {
  if (filterValue === "") {
    return items;
  }
  if (filterValue === "__unassigned__") {
    return items.filter((item) => item.groupId === null);
  }
  return items.filter((item) => item.groupId === filterValue);
}

async function render() {
  const [items, settings, groups] = await Promise.all([
    ItemRepository.list(),
    SettingsRepository.get(),
    GroupRepository.list(),
  ]);

  maskToggleEl.checked = !settings.maskEnabled;
  populateGroupFilter(groups);

  const visibleItems = filterItems(items, groupFilterEl.value);

  listEl.innerHTML = "";
  emptyStateEl.hidden = visibleItems.length > 0;

  for (const item of visibleItems) {
    const li = document.createElement("li");

    const nameEl = document.createElement("span");
    nameEl.className = "item-name";
    nameEl.textContent = item.name;
    li.appendChild(nameEl);

    const valueEl = document.createElement("span");
    valueEl.className = "item-value";
    valueEl.textContent = formatDisplayValue(item.value, settings.maskEnabled);
    li.appendChild(valueEl);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "コピー";
    copyButton.addEventListener("click", () => copyValue(item.value));
    li.appendChild(copyButton);

    listEl.appendChild(li);
  }
}

maskToggleEl.addEventListener("change", async () => {
  await SettingsRepository.setMaskEnabled(!maskToggleEl.checked);
  await render();
});

groupFilterEl.addEventListener("change", () => {
  render();
});

render();
