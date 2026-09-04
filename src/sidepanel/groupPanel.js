// 全グループパネル。未分類を含む全タブの縦リスト、グループ名での絞り込み、
// 並び替え、名称変更・削除・追加をこの1画面に集約する。
// sidepanel.js の内部状態は直接触らず、initGroupPanel で受け取るコールバック経由で連携する。

import * as GroupRepository from "../storage/groupRepository.js";
import * as ItemRepository from "../storage/itemRepository.js";
import { UNASSIGNED_TAB_ID } from "../storage/tabOrder.js";
import { ValidationError } from "../storage/errors.js";
import { attachDragReorder } from "./dragReorder.js";
import { moveInList } from "./listReorder.js";
import { createFocusTrap } from "./focusTrap.js";

const overlayEl = document.getElementById("group-panel-overlay");
const filterEl = document.getElementById("group-panel-filter");
const closeButton = document.getElementById("group-panel-close");
const listEl = document.getElementById("group-panel-list");
const emptyEl = document.getElementById("group-panel-empty");
const addButton = document.getElementById("group-panel-add");
const errorEl = document.getElementById("group-panel-error");

let callbacks = null;

const focusTrap = createFocusTrap(overlayEl, {
  fallbackFocus: () => document.querySelector(".tab-panel-open"),
});

// 画面内一時状態（chrome.storage.localには保存しない。data-model.md参照）
let panelOpen = false;
let filterTerm = "";
let openMenuTabId = null;
let editingTabId = null;
let creatingGroup = false;

// 描画のたびにストレージを読み直さないためのキャッシュ。open() と内容変更時に更新する。
let tabOrder = [];
let groupsById = new Map();
let countsByTabId = new Map();

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function validationMessage(error, fallback) {
  if (!(error instanceof ValidationError)) {
    return fallback;
  }
  if (error.field === "name") {
    return `グループ名は1〜${GroupRepository.NAME_MAX_LENGTH}文字で入力してください。`;
  }
  if (error.field === "limit") {
    return "グループはこれ以上作成できません。";
  }
  return fallback;
}

function tabLabel(tabId) {
  if (tabId === UNASSIGNED_TAB_ID) {
    return "未分類";
  }
  return groupsById.get(tabId)?.name ?? "";
}

function matchesFilter(tabId) {
  if (!filterTerm) {
    return true;
  }
  return tabLabel(tabId).toLowerCase().includes(filterTerm.toLowerCase());
}

// 件数は項目一覧を1回走査して全タブ分をまとめて数える（グループごとに問い合わせない）。
async function loadData() {
  const [order, groups, items] = await Promise.all([
    GroupRepository.listTabOrder(),
    GroupRepository.list(),
    ItemRepository.list(),
  ]);
  tabOrder = order;
  groupsById = new Map(groups.map((group) => [group.id, group]));
  countsByTabId = new Map();
  for (const item of items) {
    const key = item.groupId === null ? UNASSIGNED_TAB_ID : item.groupId;
    countsByTabId.set(key, (countsByTabId.get(key) ?? 0) + 1);
  }
}

function itemCount(tabId) {
  return countsByTabId.get(tabId) ?? 0;
}

// 未分類も他の行と同じ .group-row / 同じ高さで作る。並び替えの対象に含めるため。
function createRow(tabId) {
  const row = document.createElement("li");
  row.className = "group-row";
  row.dataset.tabId = tabId;
  // 各行を1つのタブストップにする。フォーカス表現はグローバルな :focus-visible が
  // そのまま適用されるので、行専用のスタイルは足さない。
  // role は付けない（矢印単独をリスト内移動に割り当てないため、listbox/option の期待と合わない）。
  row.tabIndex = 0;
  if (tabId === UNASSIGNED_TAB_ID) {
    row.classList.add("unassigned");
  }
  if (tabId === callbacks.getSelectedTabId()) {
    row.classList.add("current");
    row.setAttribute("aria-current", "true");
  }

  const handle = document.createElement("span");
  handle.className = "group-row-handle";
  handle.textContent = "⠿";
  handle.setAttribute("aria-hidden", "true");
  row.appendChild(handle);

  const label = tabLabel(tabId);
  const name = document.createElement("span");
  name.className = "group-row-name";
  name.textContent = label;
  name.title = label;
  row.appendChild(name);

  // メニューを開いている行は件数を隠し、その幅を操作ボタンに使う。
  if (openMenuTabId !== tabId) {
    const count = document.createElement("span");
    count.className = "group-row-count";
    count.textContent = String(itemCount(tabId));
    count.setAttribute("aria-label", `${itemCount(tabId)}件`);
    row.appendChild(count);
  }

  appendRowActions(row, tabId);
  return row;
}

// 未分類は名称変更・削除の対象外なので三点リーダーを描画しない。
function appendRowActions(row, tabId) {
  if (tabId === UNASSIGNED_TAB_ID) {
    return;
  }

  if (openMenuTabId === tabId) {
    const actions = document.createElement("span");
    actions.className = "group-row-actions";

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "名称変更";
    renameButton.addEventListener("click", () => {
      clearError();
      openMenuTabId = null;
      editingTabId = tabId;
      renderList();
    });
    actions.appendChild(renameButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteGroup(tabId));
    actions.appendChild(deleteButton);

    row.appendChild(actions);
    return;
  }

  const kebab = document.createElement("button");
  kebab.type = "button";
  kebab.className = "group-row-menu-button";
  kebab.textContent = "⋮";
  kebab.setAttribute("aria-label", `${tabLabel(tabId)}の操作`);
  kebab.addEventListener("click", () => {
    openMenuTabId = openMenuTabId === tabId ? null : tabId;
    renderList();
  });
  row.appendChild(kebab);
}

// 行をその場で入力欄に差し替える。行の高さは変えない（dragReorder が行高一定を前提にするため）。
function createInputRow(initialValue, onCommit, onCancel) {
  const row = document.createElement("li");
  row.className = "group-row group-row-editing";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "group-row-input";
  input.maxLength = GroupRepository.NAME_MAX_LENGTH;
  input.value = initialValue;
  input.setAttribute("aria-label", "グループ名");

  const counter = document.createElement("span");
  counter.className = "group-row-counter";
  const updateCounter = () => {
    counter.textContent = `${input.value.length} / ${GroupRepository.NAME_MAX_LENGTH}`;
  };
  updateCounter();
  input.addEventListener("input", updateCounter);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit(input.value);
    } else if (event.key === "Escape") {
      // 編集の取消を優先し、パネルは閉じない。
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  });

  row.appendChild(input);
  row.appendChild(counter);
  queueMicrotask(() => {
    input.focus();
    input.select();
  });
  return row;
}

function renderList() {
  listEl.innerHTML = "";
  const visibleTabIds = tabOrder.filter(matchesFilter);
  for (const tabId of visibleTabIds) {
    if (editingTabId === tabId) {
      listEl.appendChild(
        createInputRow(tabLabel(tabId), (value) => commitRename(tabId, value), cancelEdit),
      );
      continue;
    }
    listEl.appendChild(createRow(tabId));
  }
  if (creatingGroup) {
    listEl.appendChild(createInputRow("", commitCreate, cancelCreate));
  }
  emptyEl.hidden = visibleTabIds.length > 0 || creatingGroup;
  // 絞り込み中は並び替えができない。掴み手を隠して操作できないことを示す。
  listEl.classList.toggle("filtering", filterTerm !== "");
}

async function refresh() {
  await loadData();
  renderList();
}

// 並び替えを開始できる状態か。絞り込み中は全体の順序が壊れるため、
// インライン編集中は編集対象の行が動いて対応関係が崩れるため、いずれも無効にする。
// 無効化されるのは並び替えだけで、行のタップによる切替は引き続き行える。
function canReorder() {
  return filterTerm === "" && editingTabId === null && !creatingGroup;
}

function cancelEdit() {
  editingTabId = null;
  clearError();
  renderList();
}

function cancelCreate() {
  creatingGroup = false;
  clearError();
  renderList();
}

async function commitRename(tabId, value) {
  clearError();
  try {
    await GroupRepository.rename(tabId, value.trim());
  } catch (error) {
    // 入力欄は開いたままにして直せるようにする。
    showError(validationMessage(error, "名称の変更に失敗しました。もう一度お試しください。"));
    return;
  }
  editingTabId = null;
  await refresh();
  await callbacks.onTabsChanged();
}

async function commitCreate(value) {
  clearError();
  try {
    await GroupRepository.create(value.trim());
  } catch (error) {
    showError(validationMessage(error, "グループの作成に失敗しました。もう一度お試しください。"));
    return;
  }
  creatingGroup = false;
  await refresh();
  await callbacks.onTabsChanged();
}

async function deleteGroup(tabId) {
  openMenuTabId = null;
  const name = tabLabel(tabId);
  const count = itemCount(tabId);
  const confirmed = window.confirm(
    `グループ「${name}」を削除しますか？所属する項目${count}件もすべて削除されます。この操作は取り消せません。`,
  );
  if (!confirmed) {
    renderList();
    return;
  }

  try {
    await GroupRepository.remove(tabId);
  } catch (error) {
    showError("グループの削除に失敗しました。もう一度お試しください。");
    await refresh();
    return;
  }

  if (callbacks.getSelectedTabId() === tabId) {
    // 選択中のグループを消した場合は並び順の先頭のタブへ移る。
    const nextOrder = await GroupRepository.listTabOrder();
    await callbacks.onSelectTab(nextOrder[0]);
  } else {
    await callbacks.onTabsChanged();
    await callbacks.onItemsChanged();
  }
  await refresh();
}

// 再描画で行のDOM要素は作り直されるため、同じ要素へは戻せない。
// data-tab-id は再描画をまたいで同じ行を一意に指すので、これを鍵にフォーカスを戻す。
function focusRow(tabId) {
  const row = listEl.querySelector(`.group-row[data-tab-id="${CSS.escape(tabId)}"]`);
  row?.focus();
}

// 並び順の保存・再描画・エラー処理。ドラッグ経路とキーボード経路の双方から使う。
// focusTabId を渡すと、再描画後にその行へフォーカスを戻す（キーボード経路のため）。
async function applyOrder(orderedTabIds, focusTabId = null) {
  clearError();
  try {
    await GroupRepository.reorderTabs(orderedTabIds);
    tabOrder = orderedTabIds;
    if (focusTabId !== null) {
      renderList();
      focusRow(focusTabId);
    }
    await callbacks.onTabsChanged();
  } catch (error) {
    // 画面上は並び替わったのに保存されていない状態を残さない。保存済みの順序から作り直す。
    showError("並び順の保存に失敗しました。表示を保存済みの状態に戻します。");
    await loadData();
    renderList();
    if (focusTabId !== null) {
      focusRow(focusTabId);
    }
  }
}

function handleReorder(orderedRows) {
  return applyOrder(orderedRows.map((row) => row.dataset.tabId));
}

// フォーカスした行を1つ上/下へ移動する。境界に達している場合は保存もエラー表示も行わない。
function moveRow(tabId, offset) {
  const index = tabOrder.indexOf(tabId);
  if (index === -1) {
    return;
  }
  const next = moveInList(tabOrder, index, offset);
  if (next.every((id, i) => id === tabOrder[i])) {
    return;
  }
  applyOrder(next, tabId);
}

// 選択中のタブが表示範囲の中央付近に来るまでスクロールする。
// グループが多いとき、現在位置がわからないと並び替えの起点を探し直すことになるため。
function scrollToCurrentRow() {
  const row = listEl.querySelector(".group-row.current");
  if (!row) {
    return;
  }
  const target = row.offsetTop - (listEl.clientHeight - row.offsetHeight) / 2;
  listEl.scrollTop = Math.max(0, target);
}

async function open() {
  clearError();
  filterTerm = "";
  filterEl.value = "";
  openMenuTabId = null;
  editingTabId = null;
  creatingGroup = false;
  await loadData();
  renderList();
  panelOpen = true;
  overlayEl.hidden = false;
  focusTrap.activate(document.activeElement);
  filterEl.focus();
  scrollToCurrentRow();
}

// 閉じるときは経路（閉じるボタン / Escape / グループ切替）にかかわらず一時状態をすべて捨てる。
function close() {
  panelOpen = false;
  overlayEl.hidden = true;
  filterTerm = "";
  filterEl.value = "";
  openMenuTabId = null;
  editingTabId = null;
  creatingGroup = false;
  clearError();
  // 閉じた時点で、開く前にフォーカスしていた要素へ戻す。
  focusTrap.deactivate();
}

async function activateTab(tabId) {
  close();
  await callbacks.onSelectTab(tabId);
}

function handleRowKeydown(event, row) {
  const tabId = row.dataset.tabId;
  if (!tabId) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    // Space はページスクロールの既定動作を持つので抑止する。
    event.preventDefault();
    activateTab(tabId);
    return;
  }

  // Alt + 矢印で並び替え。絞り込み中・インライン編集中はドラッグと同じ条件で無効。
  if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    if (!canReorder()) {
      return;
    }
    moveRow(tabId, event.key === "ArrowUp" ? -1 : 1);
  }
}

export function initGroupPanel(options) {
  callbacks = options;

  filterEl.addEventListener("input", () => {
    filterTerm = filterEl.value.trim();
    renderList();
  });

  closeButton.addEventListener("click", () => close());

  // グループ追加。US1 単独リリース時に無反応のボタンを露出させないため、
  // HTML側では hidden にしてあり、ハンドラを付けるここで表示する。
  addButton.hidden = false;
  addButton.addEventListener("click", () => {
    clearError();
    openMenuTabId = null;
    editingTabId = null;
    creatingGroup = true;
    renderList();
    listEl.scrollTop = listEl.scrollHeight;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !panelOpen) {
      return;
    }
    // 行メニューが開いていればそれを閉じる。パネルを閉じるのはその次。
    if (openMenuTabId !== null) {
      openMenuTabId = null;
      renderList();
      return;
    }
    close();
  });

  // 行のキーボード操作。行自身にフォーカスがあるときだけ扱い、行内の三点リーダーや
  // 入力欄にフォーカスがある場合は何もしない（入力欄の Enter / Alt+矢印を奪わないため）。
  listEl.addEventListener("keydown", (event) => {
    const row = event.target.closest?.(".group-row");
    if (!row || event.target !== row) {
      return;
    }
    handleRowKeydown(event, row);
  });

  // タップ（グループ切替）とドラッグ（並び替え）は同じポインタ操作なので、
  // 判定は dragReorder に一元化する。click イベントは使わない。
  // 行内のボタンと入力欄は除外する（pointerdown の preventDefault で
  // 入力欄がフォーカスできなくなるのを避けるため）。
  attachDragReorder(listEl, {
    rowSelector: ".group-row",
    ignoreSelector: ".group-row-menu-button, .group-row-actions, .group-row-input",
    threshold: 5,
    canDrag: canReorder,
    onActivate: (row) => {
      // 入力行には data-tab-id が無い。切替の対象にしない。
      if (row.dataset.tabId) {
        activateTab(row.dataset.tabId);
      }
    },
    onReorder: handleReorder,
  });

  return { open, close, isOpen: () => panelOpen };
}
