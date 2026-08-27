import * as ItemRepository from "../storage/itemRepository.js";
import * as GroupRepository from "../storage/groupRepository.js";
import { ValidationError } from "../storage/errors.js";

const form = document.getElementById("item-form");
const idField = document.getElementById("item-id");
const nameField = document.getElementById("item-name");
const valueField = document.getElementById("item-value");
const groupField = document.getElementById("item-group");
const cancelButton = document.getElementById("item-cancel");
const errorEl = document.getElementById("item-error");
const listEl = document.getElementById("item-list");

const groupForm = document.getElementById("group-form");
const groupNameField = document.getElementById("group-name");
const groupErrorEl = document.getElementById("group-error");
const groupListEl = document.getElementById("group-list");

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function clearError(el) {
  el.hidden = true;
  el.textContent = "";
}

function resetForm() {
  idField.value = "";
  form.reset();
  cancelButton.hidden = true;
  clearError(errorEl);
}

async function populateGroupSelect(groups, selectedGroupId) {
  groupField.innerHTML = '<option value="">未分類</option>';
  for (const group of groups) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupField.appendChild(option);
  }
  groupField.value = selectedGroupId ?? "";
}

function groupNameOf(groups, groupId) {
  const group = groups.find((g) => g.id === groupId);
  return group ? group.name : "未分類";
}

async function renderItemList(groups) {
  const items = await ItemRepository.list();
  listEl.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");

    const label = document.createElement("span");
    label.textContent = `${item.name}（${groupNameOf(groups, item.groupId)}）`;
    li.appendChild(label);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => {
      idField.value = item.id;
      nameField.value = item.name;
      valueField.value = item.value;
      groupField.value = item.groupId ?? "";
      cancelButton.hidden = false;
      clearError(errorEl);
    });
    li.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", async () => {
      await ItemRepository.remove(item.id);
      if (idField.value === item.id) {
        resetForm();
      }
      await refresh();
    });
    li.appendChild(deleteButton);

    listEl.appendChild(li);
  }
}

async function renderGroupList(groups) {
  groupListEl.innerHTML = "";
  for (const group of groups) {
    const li = document.createElement("li");

    const label = document.createElement("span");
    label.textContent = group.name;
    li.appendChild(label);

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "名称変更";
    renameButton.addEventListener("click", async () => {
      const newName = window.prompt("新しいグループ名（1〜30文字）", group.name);
      if (newName === null) {
        return;
      }
      try {
        await GroupRepository.rename(group.id, newName);
        await refresh();
      } catch (error) {
        if (error instanceof ValidationError) {
          showError(groupErrorEl, error.message);
        }
      }
    });
    li.appendChild(renameButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", async () => {
      await GroupRepository.remove(group.id);
      await refresh();
    });
    li.appendChild(deleteButton);

    groupListEl.appendChild(li);
  }
}

async function refresh() {
  const groups = await GroupRepository.list();
  const currentGroupSelection = groupField.value;
  await populateGroupSelect(groups, currentGroupSelection);
  await renderItemList(groups);
  await renderGroupList(groups);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError(errorEl);

  const name = nameField.value;
  const value = valueField.value;
  const groupId = groupField.value === "" ? null : groupField.value;
  const id = idField.value;

  try {
    if (id) {
      await ItemRepository.update(id, { name, value, groupId });
    } else {
      await ItemRepository.create({ name, value, groupId });
    }
    resetForm();
    await refresh();
  } catch (error) {
    if (error instanceof ValidationError) {
      showError(errorEl, error.message);
    } else {
      showError(errorEl, "保存に失敗しました。もう一度お試しください。");
    }
  }
});

cancelButton.addEventListener("click", () => {
  resetForm();
});

groupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError(groupErrorEl);

  try {
    await GroupRepository.create(groupNameField.value);
    groupForm.reset();
    await refresh();
  } catch (error) {
    if (error instanceof ValidationError) {
      showError(groupErrorEl, error.message);
    } else {
      showError(groupErrorEl, "作成に失敗しました。もう一度お試しください。");
    }
  }
});

refresh();
