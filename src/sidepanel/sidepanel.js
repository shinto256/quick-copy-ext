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
const moreMenuButton = document.getElementById("more-menu-button");
const moreMenuEl = document.getElementById("more-menu");
const selectionToolbarEl = document.getElementById("selection-toolbar");
const selectionCountEl = document.getElementById("selection-count");
const selectionDeleteButton = document.getElementById("selection-delete-button");
const selectionCancelButton = document.getElementById("selection-cancel-button");

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
let moreMenuOpen = false;
let draggingItemId = null;
let selectionMode = false;
let selectedItemIds = new Set();
let currentTheme = "auto";

function currentGroupId() {
  return selectedTabId === UNASSIGNED_TAB_ID ? null : selectedTabId;
}

function getVisibleItemIds() {
  return Array.from(listEl.querySelectorAll(".item-card")).map((li) => li.dataset.itemId);
}

async function persistReorder(orderedIds) {
  await ItemRepository.reorderGroup(currentGroupId(), orderedIds);
  await renderList();
}

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
  li.dataset.itemId = item.id;

  if (selectionMode) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "item-checkbox";
    checkbox.checked = selectedItemIds.has(item.id);
    checkbox.setAttribute("aria-label", `${item.name}を選択`);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedItemIds.add(item.id);
      } else {
        selectedItemIds.delete(item.id);
      }
      updateSelectionToolbar();
    });
    li.appendChild(checkbox);
  }

  if (!searchTerm && !selectionMode) {
    li.draggable = true;
    li.addEventListener("dragstart", (event) => {
      draggingItemId = item.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", () => {
      draggingItemId = null;
      li.classList.remove("dragging");
    });
    li.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    li.addEventListener("dragenter", (event) => {
      event.preventDefault();
      if (draggingItemId && draggingItemId !== item.id) {
        li.classList.add("drag-over");
      }
    });
    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over");
    });
    li.addEventListener("drop", async (event) => {
      event.preventDefault();
      li.classList.remove("drag-over");
      const sourceId = draggingItemId;
      draggingItemId = null;
      if (!sourceId || sourceId === item.id) {
        return;
      }
      const ids = getVisibleItemIds().filter((id) => id !== sourceId);
      const targetIndex = ids.indexOf(item.id);
      ids.splice(targetIndex, 0, sourceId);
      await persistReorder(ids);
    });
  }

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

    if (!searchTerm) {
      const moveUpButton = document.createElement("button");
      moveUpButton.type = "button";
      moveUpButton.textContent = "上へ移動";
      moveUpButton.addEventListener("click", () => moveItem(item, -1));
      menu.appendChild(moveUpButton);

      const moveDownButton = document.createElement("button");
      moveDownButton.type = "button";
      moveDownButton.textContent = "下へ移動";
      moveDownButton.addEventListener("click", () => moveItem(item, 1));
      menu.appendChild(moveDownButton);
    }

    actions.appendChild(menu);
  }

  li.appendChild(actions);
  return li;
}

async function moveItem(item, offset) {
  openItemMenuId = null;
  const ids = getVisibleItemIds();
  const index = ids.indexOf(item.id);
  const targetIndex = index + offset;
  if (index === -1 || targetIndex < 0 || targetIndex >= ids.length) {
    await renderList();
    return;
  }
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  await persistReorder(ids);
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

// ---- その他メニュー(テーマ設定・選択モード開始) ----

const THEME_OPTIONS = [
  { value: "auto", label: "自動" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

function applyTheme(theme) {
  if (theme === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

async function selectTheme(theme) {
  currentTheme = theme;
  applyTheme(theme);
  await SettingsRepository.setTheme(theme);
  moreMenuOpen = false;
  renderMoreMenu();
}

function renderMoreMenu() {
  moreMenuEl.hidden = !moreMenuOpen;
  moreMenuEl.innerHTML = "";
  if (!moreMenuOpen) {
    return;
  }

  const themeSection = document.createElement("div");
  themeSection.className = "more-menu-section";

  const themeLabel = document.createElement("span");
  themeLabel.className = "more-menu-label";
  themeLabel.textContent = "テーマ";
  themeSection.appendChild(themeLabel);

  for (const option of THEME_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "more-menu-item" + (currentTheme === option.value ? " active" : "");
    button.textContent = option.label;
    button.addEventListener("click", () => selectTheme(option.value));
    themeSection.appendChild(button);
  }

  moreMenuEl.appendChild(themeSection);

  const divider = document.createElement("div");
  divider.className = "more-menu-divider";
  moreMenuEl.appendChild(divider);

  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.className = "more-menu-item";
  selectButton.textContent = "選択";
  selectButton.addEventListener("click", () => {
    moreMenuOpen = false;
    renderMoreMenu();
    startSelectionMode();
  });
  moreMenuEl.appendChild(selectButton);
}

moreMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  moreMenuOpen = !moreMenuOpen;
  renderMoreMenu();
});

// ---- 選択モード・一括削除 ----

function updateSelectionToolbar() {
  selectionToolbarEl.hidden = !selectionMode;
  selectionCountEl.textContent = `${selectedItemIds.size}件選択中`;
  selectionDeleteButton.disabled = selectedItemIds.size === 0;
}

async function startSelectionMode() {
  selectionMode = true;
  selectedItemIds = new Set();
  updateSelectionToolbar();
  await renderList();
}

async function exitSelectionMode() {
  selectionMode = false;
  selectedItemIds = new Set();
  updateSelectionToolbar();
  await renderList();
}

selectionCancelButton.addEventListener("click", () => exitSelectionMode());

selectionDeleteButton.addEventListener("click", async () => {
  if (selectedItemIds.size === 0) {
    return;
  }
  const confirmed = window.confirm(
    `選択した${selectedItemIds.size}件の項目を削除しますか？この操作は取り消せません。`,
  );
  if (!confirmed) {
    return;
  }
  await ItemRepository.removeMany([...selectedItemIds]);
  await exitSelectionMode();
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
    `グループ「${group.name}」を削除しますか？所属する項目もすべて削除されます。この操作は取り消せません。`
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
  if (selectionMode) {
    selectionMode = false;
    selectedItemIds = new Set();
    updateSelectionToolbar();
  }
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
  if (moreMenuOpen && !event.target.closest(".more-menu-wrapper")) {
    moreMenuOpen = false;
    renderMoreMenu();
  }
});

// ---- マスク切替・検索 ----

async function initMaskToggle() {
  const settings = await SettingsRepository.get();
  maskToggle.checked = !settings.maskEnabled;
  // 表示切替のちらつきを防ぐため、一覧描画より前にテーマを反映する。
  currentTheme = settings.theme;
  applyTheme(currentTheme);
}

maskToggle.addEventListener("change", async () => {
  await SettingsRepository.setMaskEnabled(!maskToggle.checked);
  await renderList();
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  if (selectionMode) {
    selectionMode = false;
    selectedItemIds = new Set();
    updateSelectionToolbar();
  }
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
