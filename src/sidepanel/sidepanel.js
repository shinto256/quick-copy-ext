import * as ItemRepository from "../storage/itemRepository.js";
import * as GroupRepository from "../storage/groupRepository.js";
import * as SettingsRepository from "../storage/settingsRepository.js";
import { ValidationError } from "../storage/errors.js";
import { formatDisplayValue } from "./maskDisplay.js";
import { filterItemsByTabAndSearch, UNASSIGNED_TAB_ID } from "./itemFilter.js";

const searchInput = document.getElementById("search-input");
const maskToggle = document.getElementById("mask-toggle");
const addItemButton = document.getElementById("add-item-button");
const tabsEl = document.getElementById("tabs");
const groupErrorEl = document.getElementById("group-error");
const listEl = document.getElementById("item-list");
const emptyStateEl = document.getElementById("empty-state");
const copyStatusEl = document.getElementById("copy-status");
const formOverlay = document.getElementById("item-form-overlay");
const form = document.getElementById("item-form");
const idField = document.getElementById("item-id");
const nameField = document.getElementById("item-name");
const valueField = document.getElementById("item-value");
const groupField = document.getElementById("item-group");
const cancelButton = document.getElementById("item-cancel");
const itemErrorEl = document.getElementById("item-error");

// 画面内一時状態（chrome.storage.localには保存しない。data-model.md参照）
let selectedTabId = UNASSIGNED_TAB_ID;
let searchTerm = "";
let editingItemId = null;
let isFormOpen = false;

// タブ/カードのケバブメニュー開閉用の一時状態
let openTabMenuGroupId = null;
let openItemMenuId = null;
let creatingGroup = false;
let renamingGroupId = null;

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

function showGroupError(message) {
  groupErrorEl.textContent = message;
  groupErrorEl.hidden = false;
}

function clearGroupError() {
  groupErrorEl.hidden = true;
  groupErrorEl.textContent = "";
}

function showItemError(message) {
  itemErrorEl.textContent = message;
  itemErrorEl.hidden = false;
}

function clearItemError() {
  itemErrorEl.hidden = true;
  itemErrorEl.textContent = "";
}

// ---- 一覧（カード）表示 ----

async function renderList() {
  const [items, settings] = await Promise.all([ItemRepository.list(), SettingsRepository.get()]);
  const visibleItems = filterItemsByTabAndSearch(items, selectedTabId, searchTerm);

  listEl.innerHTML = "";
  emptyStateEl.hidden = visibleItems.length > 0;
  emptyStateEl.textContent = searchTerm ? "該当する項目はありません。" : "登録済みの項目はありません。";

  for (const item of visibleItems) {
    listEl.appendChild(createItemCard(item, settings.maskEnabled));
  }
}

function createItemCard(item, maskEnabled) {
  const li = document.createElement("li");
  li.className = "item-card";

  const main = document.createElement("div");
  main.className = "item-card-main";

  const nameEl = document.createElement("span");
  nameEl.className = "item-name";
  nameEl.textContent = item.name;
  main.appendChild(nameEl);

  const valueEl = document.createElement("span");
  valueEl.className = "item-value";
  valueEl.textContent = formatDisplayValue(item.value, maskEnabled);
  main.appendChild(valueEl);

  li.appendChild(main);

  const actions = document.createElement("div");
  actions.className = "item-card-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-button";
  copyButton.textContent = "コピー";
  copyButton.addEventListener("click", () => copyValue(item.value));
  actions.appendChild(copyButton);

  const kebabButton = document.createElement("button");
  kebabButton.type = "button";
  kebabButton.className = "kebab-button";
  kebabButton.textContent = "⋮";
  kebabButton.setAttribute("aria-label", `${item.name}の操作`);
  kebabButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openItemMenuId = openItemMenuId === item.id ? null : item.id;
    renderList();
  });
  actions.appendChild(kebabButton);

  if (openItemMenuId === item.id) {
    const menu = document.createElement("div");
    menu.className = "item-menu";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => {
      openItemMenuId = null;
      openItemForm(item);
    });
    menu.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteItem(item));
    menu.appendChild(deleteButton);

    actions.appendChild(menu);
  }

  li.appendChild(actions);
  return li;
}

async function deleteItem(item) {
  openItemMenuId = null;
  const confirmed = window.confirm(`「${item.name}」を削除しますか？`);
  if (!confirmed) {
    await renderList();
    return;
  }
  await ItemRepository.remove(item.id);
  await renderList();
}

// ---- 項目登録・編集フォーム ----

async function populateGroupSelect(selectedGroupId) {
  const groups = await GroupRepository.list();
  groupField.innerHTML = '<option value="">未分類</option>';
  for (const group of groups) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupField.appendChild(option);
  }
  groupField.value = selectedGroupId ?? "";
}

async function openItemForm(item = null) {
  isFormOpen = true;
  editingItemId = item ? item.id : null;
  idField.value = item ? item.id : "";
  nameField.value = item ? item.name : "";
  valueField.value = item ? item.value : "";
  clearItemError();

  const defaultGroupId = item
    ? item.groupId
    : selectedTabId === UNASSIGNED_TAB_ID
      ? null
      : selectedTabId;
  await populateGroupSelect(defaultGroupId);

  formOverlay.hidden = false;
  nameField.focus();
}

function closeItemForm() {
  isFormOpen = false;
  editingItemId = null;
  form.reset();
  idField.value = "";
  clearItemError();
  formOverlay.hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearItemError();

  const name = nameField.value;
  const value = valueField.value;
  const groupId = groupField.value === "" ? null : groupField.value;

  try {
    if (editingItemId) {
      await ItemRepository.update(editingItemId, { name, value, groupId });
    } else {
      await ItemRepository.create({ name, value, groupId });
    }
    closeItemForm();
    await renderTabs();
    await renderList();
  } catch (error) {
    if (error instanceof ValidationError) {
      showItemError(error.message);
    } else {
      showItemError("保存に失敗しました。もう一度お試しください。");
    }
  }
});

cancelButton.addEventListener("click", () => closeItemForm());
addItemButton.addEventListener("click", () => openItemForm(null));

form.addEventListener("click", (event) => event.stopPropagation());
formOverlay.addEventListener("click", (event) => {
  if (event.target === formOverlay) {
    closeItemForm();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && isFormOpen) {
    closeItemForm();
  }
});

// ---- タブ（グループ） ----

async function renderTabs() {
  const groups = await GroupRepository.list();
  tabsEl.innerHTML = "";
  tabsEl.appendChild(createTabElement(UNASSIGNED_TAB_ID, "未分類", null));

  for (const group of groups) {
    tabsEl.appendChild(createTabElement(group.id, group.name, group));
  }

  if (creatingGroup) {
    tabsEl.appendChild(createGroupInlineInput());
  } else {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "tab-add";
    addButton.textContent = "＋";
    addButton.setAttribute("aria-label", "新規グループを作成");
    addButton.addEventListener("click", () => {
      creatingGroup = true;
      renderTabs();
    });
    tabsEl.appendChild(addButton);
  }
}

function createTabElement(groupId, label, group) {
  const wrapper = document.createElement("div");
  wrapper.className = "tab-wrapper";

  if (group && renamingGroupId === groupId) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "tab-rename-input";
    input.maxLength = 30;
    input.value = label;
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        await submitRenameGroup(group, input.value);
      } else if (event.key === "Escape") {
        renamingGroupId = null;
        renderTabs();
      }
    });
    input.addEventListener("blur", () => {
      renamingGroupId = null;
      renderTabs();
    });
    wrapper.appendChild(input);
    queueMicrotask(() => input.focus());
    return wrapper;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "tab-button" + (selectedTabId === groupId ? " active" : "");
  button.textContent = label;
  button.addEventListener("click", () => selectTab(groupId));
  wrapper.appendChild(button);

  if (group) {
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "tab-menu-button";
    menuButton.textContent = "⋮";
    menuButton.setAttribute("aria-label", `${label}の操作`);
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openTabMenuGroupId = openTabMenuGroupId === groupId ? null : groupId;
      renderTabs();
    });
    wrapper.appendChild(menuButton);

    if (openTabMenuGroupId === groupId) {
      const menu = document.createElement("div");
      menu.className = "tab-menu";

      const renameButton = document.createElement("button");
      renameButton.type = "button";
      renameButton.textContent = "名称変更";
      renameButton.addEventListener("click", () => {
        openTabMenuGroupId = null;
        renamingGroupId = groupId;
        renderTabs();
      });
      menu.appendChild(renameButton);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "削除";
      deleteButton.addEventListener("click", () => deleteGroup(group));
      menu.appendChild(deleteButton);

      wrapper.appendChild(menu);
    }
  }

  return wrapper;
}

function createGroupInlineInput() {
  const wrapper = document.createElement("div");
  wrapper.className = "tab-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "tab-rename-input";
  input.maxLength = 30;
  input.placeholder = "新規グループ名";
  input.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      await submitCreateGroup(input.value);
    } else if (event.key === "Escape") {
      creatingGroup = false;
      renderTabs();
    }
  });
  input.addEventListener("blur", () => {
    creatingGroup = false;
    renderTabs();
  });
  wrapper.appendChild(input);
  queueMicrotask(() => input.focus());
  return wrapper;
}

async function submitCreateGroup(name) {
  clearGroupError();
  try {
    await GroupRepository.create(name);
    creatingGroup = false;
    await renderTabs();
  } catch (error) {
    if (error instanceof ValidationError) {
      showGroupError(error.message);
    } else {
      showGroupError("作成に失敗しました。もう一度お試しください。");
    }
  }
}

async function submitRenameGroup(group, name) {
  clearGroupError();
  try {
    await GroupRepository.rename(group.id, name);
    renamingGroupId = null;
    await renderTabs();
  } catch (error) {
    if (error instanceof ValidationError) {
      showGroupError(error.message);
    } else {
      showGroupError("名称変更に失敗しました。もう一度お試しください。");
    }
  }
}

async function deleteGroup(group) {
  openTabMenuGroupId = null;
  const confirmed = window.confirm(
    `グループ「${group.name}」を削除しますか？所属する項目は未分類になります。`
  );
  if (!confirmed) {
    await renderTabs();
    return;
  }
  await GroupRepository.remove(group.id);
  if (selectedTabId === group.id) {
    selectedTabId = UNASSIGNED_TAB_ID;
  }
  await renderTabs();
  await renderList();
}

async function selectTab(groupId) {
  selectedTabId = groupId;
  searchTerm = "";
  searchInput.value = "";
  await renderTabs();
  await renderList();
}

document.addEventListener("click", (event) => {
  if (openTabMenuGroupId !== null && !event.target.closest(".tab-wrapper")) {
    openTabMenuGroupId = null;
    renderTabs();
  }
  if (openItemMenuId !== null && !event.target.closest(".item-card-actions")) {
    openItemMenuId = null;
    renderList();
  }
});

// ---- マスク切替・検索 ----

async function initMaskToggle() {
  const settings = await SettingsRepository.get();
  maskToggle.checked = !settings.maskEnabled;
}

maskToggle.addEventListener("change", async () => {
  await SettingsRepository.setMaskEnabled(!maskToggle.checked);
  await renderList();
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  renderList();
});

// ---- 初期化 ----

async function init() {
  await initMaskToggle();
  const groups = await GroupRepository.list();
  selectedTabId = groups.length > 0 ? groups[0].id : UNASSIGNED_TAB_ID;
  await renderTabs();
  await renderList();
}

init();
