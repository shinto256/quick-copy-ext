import * as ItemRepository from "../storage/itemRepository.js";
import * as GroupRepository from "../storage/groupRepository.js";
import * as SettingsRepository from "../storage/settingsRepository.js";
import { ValidationError } from "../storage/errors.js";
import { formatDisplayValue } from "./maskDisplay.js";
import { filterItemsByTabAndSearch, UNASSIGNED_TAB_ID } from "./itemFilter.js";
import { initGroupPanel } from "./groupPanel.js";
import { attachDragReorder } from "./dragReorder.js";
import { createFocusTrap } from "./focusTrap.js";
import { isActivationKey, moveInList, reorderOffsetFromKey } from "./listReorder.js";
import { visibleTabIndexes } from "./tabOverflow.js";

const searchInput = document.getElementById("search-input");
const maskToggle = document.getElementById("mask-toggle");
const addItemButton = document.getElementById("add-item-button");
const tabsEl = document.getElementById("tabs");
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
const selectionGroupChangeButton = document.getElementById("selection-group-change-button");
const selectionGroupChangePopoverEl = document.getElementById("selection-group-change-popover");
const selectionGroupSelect = document.getElementById("selection-group-select");
const selectionGroupChangeApplyButton = document.getElementById(
  "selection-group-change-apply-button",
);
const selectionGroupChangeCancelButton = document.getElementById(
  "selection-group-change-cancel-button",
);

// 画面内一時状態（chrome.storage.localには保存しない。data-model.md参照）
let selectedTabId = UNASSIGNED_TAB_ID;
let searchTerm = "";
let editingItemId = null;
let isFormOpen = false;

// カードのケバブメニュー開閉用の一時状態
let openItemMenuId = null;
let moreMenuOpen = false;
let selectionMode = false;
let selectedItemIds = new Set();
let groupChangePopoverOpen = false;
let currentTheme = "auto";

function currentGroupId() {
  return selectedTabId === UNASSIGNED_TAB_ID ? null : selectedTabId;
}

function getVisibleItemIds() {
  return Array.from(listEl.querySelectorAll(".item-card")).map((li) => li.dataset.itemId);
}

// カードのタップからコピー対象を引くための、表示中の項目のキャッシュ。renderListで更新する。
let visibleItemsById = new Map();

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
    return true;
  } catch (error) {
    showCopyStatus("コピーに失敗しました");
    return false;
  }
}

// コピー成功をボタン上で示す。アイコンと色が変わり、一定時間後に元へ戻る。
// 連続でコピーしたときに前回のタイマーが先に発火しないよう、要素ごとに保持する。
function markCopied(button) {
  clearTimeout(copiedTimers.get(button));
  button.classList.add("copied");
  copiedTimers.set(
    button,
    setTimeout(() => {
      button.classList.remove("copied");
      copiedTimers.delete(button);
    }, 2000),
  );
}

const copiedTimers = new WeakMap();

function showItemError(message) {
  itemErrorEl.textContent = message;
  itemErrorEl.hidden = false;
}

function clearItemError() {
  itemErrorEl.hidden = true;
  itemErrorEl.textContent = "";
}

const itemFormFocusTrap = createFocusTrap(formOverlay, {
  fallbackFocus: () => addItemButton,
});

// ---- 一覧（カード）表示 ----

async function renderList() {
  const [items, settings] = await Promise.all([ItemRepository.list(), SettingsRepository.get()]);
  const visibleItems = filterItemsByTabAndSearch(items, selectedTabId, searchTerm);

  listEl.innerHTML = "";
  emptyStateEl.hidden = visibleItems.length > 0;
  emptyStateEl.textContent = searchTerm ? "該当する項目はありません。" : "登録済みの項目はありません。";

  visibleItemsById = new Map(visibleItems.map((item) => [item.id, item]));
  for (const item of visibleItems) {
    listEl.appendChild(createItemCard(item, settings.maskEnabled));
  }
}

function createItemCard(item, maskEnabled) {
  const li = document.createElement("li");
  li.className = "item-card";
  li.dataset.itemId = item.id;
  // カードを1つのタブストップにする。フォーカス表現はグローバルな :focus-visible が
  // そのまま適用されるので、カード専用のスタイルは足さない。
  // role は付けない（グループの縦リストの行と同じ方式）。
  li.tabIndex = 0;

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

  // 並び替えの起点。カード本体を押す操作はコピーに割り当てられているため、
  // ドラッグはこの掴み手からのみ開始する（誤って並び替わるのを防ぐ）。
  // ポインタによる並び替えが有効なときだけ描画する。
  if (!searchTerm && !selectionMode) {
    const handle = document.createElement("span");
    handle.className = "item-card-handle";
    handle.textContent = "⠿";
    handle.setAttribute("aria-hidden", "true");
    li.appendChild(handle);
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
  copyButton.setAttribute("aria-label", `${item.name}をコピー`);
  copyButton.title = "コピー";
  copyButton.disabled = selectionMode;
  copyButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (await copyValue(item.value)) {
      markCopied(copyButton);
    }
  });
  actions.appendChild(copyButton);

  // 選択モード以外では、ボタン以外のどこを押してもコピーできるようにする。
  // タップ（コピー）とドラッグ（並び替え）は同じポインタ操作なので、判定は
  // dragReorder に一元化する（clickリスナーは持たせない）。
  // キーボード操作にはコピーボタンがあるため、カード自体はフォーカス対象にしない。
  if (!selectionMode) {
    li.classList.add("copyable");
  }

  const kebabButton = document.createElement("button");
  kebabButton.type = "button";
  kebabButton.className = "kebab-button";
  kebabButton.textContent = "⋮";
  kebabButton.setAttribute("aria-label", `${item.name}の操作`);
  kebabButton.disabled = selectionMode;
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
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openItemMenuId = null;
      openItemForm(item);
    });
    menu.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteItem(item);
    });
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

async function populateGroupSelect(selectField, selectedGroupId) {
  const groups = await GroupRepository.list();
  selectField.innerHTML = '<option value="">未分類</option>';
  for (const group of groups) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    selectField.appendChild(option);
  }
  selectField.value = selectedGroupId ?? "";
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
  await populateGroupSelect(groupField, defaultGroupId);

  formOverlay.hidden = false;
  itemFormFocusTrap.activate(document.activeElement);
  nameField.focus();
}

function closeItemForm() {
  isFormOpen = false;
  editingItemId = null;
  form.reset();
  idField.value = "";
  clearItemError();
  formOverlay.hidden = true;
  // 閉じた時点で、開く前にフォーカスしていた要素へ戻す。
  itemFormFocusTrap.deactivate();
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
  selectionGroupChangeButton.disabled = selectedItemIds.size === 0;
  selectionGroupChangePopoverEl.hidden = !groupChangePopoverOpen;
}

async function openGroupChangePopover() {
  await populateGroupSelect(selectionGroupSelect, null);
  groupChangePopoverOpen = true;
  updateSelectionToolbar();
}

function closeGroupChangePopover() {
  groupChangePopoverOpen = false;
  updateSelectionToolbar();
}

async function startSelectionMode() {
  selectionMode = true;
  selectedItemIds = new Set();
  openItemMenuId = null;
  updateSelectionToolbar();
  await renderList();
}

async function exitSelectionMode() {
  selectionMode = false;
  selectedItemIds = new Set();
  groupChangePopoverOpen = false;
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

selectionGroupChangeButton.addEventListener("click", async () => {
  if (selectedItemIds.size === 0) {
    return;
  }
  await openGroupChangePopover();
});

selectionGroupChangeApplyButton.addEventListener("click", async () => {
  if (selectedItemIds.size === 0) {
    return;
  }
  const groupId = selectionGroupSelect.value === "" ? null : selectionGroupSelect.value;
  await ItemRepository.updateGroupMany([...selectedItemIds], groupId);
  await renderTabs();
  await exitSelectionMode();
});

selectionGroupChangeCancelButton.addEventListener("click", () => {
  closeGroupChangePopover();
});

// ---- タブ（グループ） ----

async function renderTabs() {
  // 表示順の情報源は tabOrder。groups は名前を引くための集合として使う。
  const [groups, tabOrder] = await Promise.all([
    GroupRepository.list(),
    GroupRepository.listTabOrder(),
  ]);
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  tabsEl.innerHTML = "";

  for (const tabId of tabOrder) {
    if (tabId === UNASSIGNED_TAB_ID) {
      tabsEl.appendChild(createTabElement(UNASSIGNED_TAB_ID, "未分類"));
      continue;
    }
    const group = groupsById.get(tabId);
    tabsEl.appendChild(createTabElement(group.id, group.name));
  }

  tabsEl.appendChild(createPanelOpenButton(tabOrder.length));

  measureTabs();
  applyTabOverflow();
}

// 直近の renderTabs で測ったタブの幅と要素。ResizeObserver の通知では
// これを使い回し、DOMを作り直さずに表示可否だけを再計算する。
let measuredTabs = [];
let panelButtonWidth = 0;
let tabsGap = 0;

// 描画済みのタブの幅を測る。全タブを描画した直後に一度だけ呼ぶ。
// 隠す前に測るので、隠す予定のタブも正しい幅が取れる。
function measureTabs() {
  const panelButton = tabsEl.querySelector(".tab-panel-open");
  const tabButtons = Array.prototype.slice.call(tabsEl.querySelectorAll(".tab-button"));
  measuredTabs = tabButtons.map((el) => ({
    el,
    tabId: el.dataset.tabId,
    width: el.getBoundingClientRect().width,
  }));
  panelButtonWidth = panelButton ? panelButton.getBoundingClientRect().width : 0;
  tabsGap = Number.parseFloat(getComputedStyle(tabsEl).columnGap) || 0;
}

// 幅に収まらないタブを hidden にする。hidden はレイアウトから外れるため、
// タブバーの幅に影響せずキーボードのフォーカス移動の対象にもならない。
function applyTabOverflow() {
  if (measuredTabs.length === 0) {
    return;
  }
  const style = getComputedStyle(tabsEl);
  const inner =
    tabsEl.clientWidth -
    (Number.parseFloat(style.paddingLeft) || 0) -
    (Number.parseFloat(style.paddingRight) || 0);
  // サイドパネルが表示されていない状態（幅が0）では計算しない。
  if (inner <= 0) {
    return;
  }

  // 末尾のボタンは常に表示するため、その幅とその前の gap を先に差し引く。
  const available = inner - panelButtonWidth - tabsGap;
  const selectedIndex = measuredTabs.findIndex((tab) => tab.tabId === selectedTabId);
  const visible = visibleTabIndexes(
    measuredTabs.map((tab) => tab.width),
    available,
    tabsGap,
    selectedIndex,
  );

  measuredTabs.forEach((tab, index) => {
    tab.el.hidden = !visible.has(index);
  });
}

// タブバー末尾に固定表示する、全グループパネルを開くボタン。
// 併記する数は未分類を含むタブの総数（正規化後の並び順の要素数と一致する）。
function createPanelOpenButton(tabCount) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tab-panel-open";
  button.textContent = `▾ ${tabCount}`;
  button.setAttribute("aria-label", `グループ一覧を開く（全${tabCount}件）`);
  button.title = "グループ一覧";
  button.disabled = selectionMode;
  button.addEventListener("click", () => groupPanel.open());
  return button;
}

// タブは切り替え専用。名称変更・削除・追加は全グループパネル（groupPanel.js）が担う。
function createTabElement(groupId, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.tabId = groupId;
  const isSelected = selectedTabId === groupId;
  button.className = "tab-button" + (isSelected ? " active" : "");
  if (isSelected) {
    button.setAttribute("aria-current", "true");
  }
  button.textContent = label;
  // タブは幅の上限で末尾省略されるため、全文はツールチップとパネルの縦リストで読めるようにする。
  button.title = label;
  button.addEventListener("click", () => selectTab(groupId));
  return button;
}

async function selectTab(groupId) {
  selectedTabId = groupId;
  searchTerm = "";
  searchInput.value = "";
  if (selectionMode) {
    selectionMode = false;
    selectedItemIds = new Set();
    groupChangePopoverOpen = false;
    updateSelectionToolbar();
  }
  await renderTabs();
  await renderList();
}

// 項目登録フォームを Escape で閉じる。全グループパネルと挙動を揃える。
// closeItemForm が form.reset() を行うため入力内容は保存されない。
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isFormOpen) {
    closeItemForm();
  }
});

document.addEventListener("click", (event) => {
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
    groupChangePopoverOpen = false;
    updateSelectionToolbar();
  }
  renderList();
});

// ---- 項目カードのタップ／ドラッグ ----

// spec 003 FR-001（ドラッグ&ドロップによる並び替え）。FR-002 の上下移動ボタンは
// ドラッグ操作の代替手段として残す。FR-004 により検索絞り込み中は無効。
attachDragReorder(listEl, {
  rowSelector: ".item-card",
  // 項目一覧は #item-list 自身ではなくドキュメントがスクロールする。
  scrollContainer: document.scrollingElement,
  ignoreSelector: ".copy-button, .kebab-button, .item-menu, .item-checkbox",
  // ドラッグは掴み手からのみ開始する。カード本体を押した操作はコピーに使う。
  // グループの縦リストには渡さない（行を押す操作は切替で、誤操作の代償が小さい）。
  handleSelector: ".item-card-handle",
  canDrag: () => !searchTerm && !selectionMode,
  onActivate: async (row) => {
    // 選択モード中はコピーを行わない（spec 005）。
    if (selectionMode) {
      return;
    }
    const item = visibleItemsById.get(row.dataset.itemId);
    if (!item) {
      return;
    }
    if (await copyValue(item.value)) {
      const copyButton = row.querySelector(".copy-button");
      if (copyButton) {
        markCopied(copyButton);
      }
    }
  },
  onReorder: (orderedRows) => persistReorder(orderedRows.map((row) => row.dataset.itemId)),
});

// カードのキーボード操作。並び替えのキーはグループの縦リストと同一（listReorder.js で共有）。
// event.target がカード自身でない場合（コピーボタン・三点リーダー・チェックボックス）は
// 何もしない。それぞれの通常の操作を奪わないため。
listEl.addEventListener("keydown", (event) => {
  const card = event.target.closest?.(".item-card");
  if (!card || event.target !== card) {
    return;
  }
  // 検索絞り込み中と選択モード中は、ドラッグと同じ条件で並び替え・コピーとも行わない。
  if (searchTerm || selectionMode) {
    return;
  }

  if (isActivationKey(event)) {
    // Space はページスクロールの既定動作を持つので抑止する。
    event.preventDefault();
    copyCardValue(card);
    return;
  }

  const offset = reorderOffsetFromKey(event);
  if (offset !== null) {
    event.preventDefault();
    moveCard(card.dataset.itemId, offset);
  }
});

async function copyCardValue(card) {
  const item = visibleItemsById.get(card.dataset.itemId);
  if (!item) {
    return;
  }
  if (await copyValue(item.value)) {
    const copyButton = card.querySelector(".copy-button");
    if (copyButton) {
      markCopied(copyButton);
    }
  }
}

// 再描画でカードのDOM要素は作り直されるため、同じ要素へは戻せない。
// data-item-id は再描画をまたいで同じ項目を一意に指すので、これを鍵にフォーカスを戻す。
function focusCard(itemId) {
  listEl.querySelector(`.item-card[data-item-id="${CSS.escape(itemId)}"]`)?.focus();
}

// フォーカスしたカードを1つ上/下へ移動する。境界に達している場合は何もしない。
async function moveCard(itemId, offset) {
  const ids = getVisibleItemIds();
  const index = ids.indexOf(itemId);
  if (index === -1) {
    return;
  }
  const next = moveInList(ids, index, offset);
  if (next.every((id, i) => id === ids[i])) {
    return;
  }
  await persistReorder(next);
  focusCard(itemId);
}

// ---- 全グループパネル ----

const groupPanel = initGroupPanel({
  getSelectedTabId: () => selectedTabId,
  isSelectionMode: () => selectionMode,
  onSelectTab: (tabId) => selectTab(tabId),
  onTabsChanged: () => renderTabs(),
  onItemsChanged: () => renderList(),
});

// タブバーの幅の変化に追従する。通知では表示可否だけを再計算し、renderTabs は呼ばない
// （ストレージの読み出しとDOMの再構築がドラッグ中に繰り返されるのを避ける）。
new ResizeObserver(() => applyTabOverflow()).observe(tabsEl);

// ---- 初期化 ----

async function init() {
  await initMaskToggle();
  // 起動時は並び順の先頭のタブを開く。既定の並び順では未分類が先頭になる。
  const tabOrder = await GroupRepository.listTabOrder();
  selectedTabId = tabOrder[0];
  await renderTabs();
  await renderList();
}

init();
