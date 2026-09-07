// 英語辞書。キー一覧は specs/011-sidepanel-i18n/contracts/i18n-contract.md の
// 「翻訳キー一覧」表を正とする。件数を含むキーは count === 1 を単数、それ以外を複数として分岐する。

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

export default {
  "header.searchPlaceholder": "Search by item name",
  "header.maskToggle": "Unmask",
  "header.addItem": "Add item",
  "header.moreMenu": "More menu",

  "tabs.ariaLabel": "Group tabs",
  "common.unassigned": "Unassigned",
  "tabs.openPanelButton": (p) => `▾ ${p.count}`,
  "tabs.openPanelAria": (p) =>
    `Open group list (${p.count} ${plural(p.count, "group", "groups")})`,
  "tabs.openPanelTitle": "Group list",

  "selection.count": (p) => `${p.count} ${plural(p.count, "item", "items")} selected`,
  "selection.groupChange": "Change group",
  "selection.delete": "Delete",
  "selection.cancel": "Cancel",
  "selection.changeGroupLabel": "Target group",
  "selection.apply": "Apply",
  "selection.confirmDelete": (p) =>
    `Delete ${p.count} selected ${plural(p.count, "item", "items")}? This cannot be undone.`,

  "itemList.empty": "No items registered yet.",
  "itemList.emptyFiltered": "No matching items.",

  "itemCard.selectAria": (p) => `Select ${p.name}`,
  "itemCard.copyAria": (p) => `Copy ${p.name}`,
  "itemCard.copyTitle": "Copy",
  "itemCard.kebabAria": (p) => `Actions for ${p.name}`,
  "itemCard.edit": "Edit",
  "itemCard.delete": "Delete",
  "itemCard.confirmDelete": (p) => `Delete "${p.name}"?`,

  "itemForm.nameLabel": (p) => `Name (1–${p.max} characters)`,
  "itemForm.valueLabel": (p) => `Value (1–${p.max} characters, multiline allowed)`,
  "itemForm.groupLabel": "Group",
  "itemForm.save": "Save",
  "itemForm.cancel": "Cancel",
  "itemForm.errorNameLength": (p) => `Name must be 1–${p.max} characters.`,
  "itemForm.errorValueLength": (p) => `Value must be 1–${p.max} characters.`,
  "itemForm.errorLimit": "You cannot register any more items.",
  "itemForm.errorGeneric": "Failed to save. Please try again.",

  "copyStatus.success": "Copied",
  "copyStatus.failure": "Failed to copy",

  "moreMenu.theme": "Theme",
  "moreMenu.themeAuto": "Auto",
  "moreMenu.themeLight": "Light",
  "moreMenu.themeDark": "Dark",
  "moreMenu.language": "Language",
  "moreMenu.languageJa": "日本語",
  "moreMenu.languageEn": "English",
  "moreMenu.select": "Select",

  "groupPanel.filterPlaceholder": "Filter by group name",
  "groupPanel.closeAria": "Close group list",
  "groupPanel.empty": "No matching groups.",
  "groupPanel.addButtonLabel": "+ Add group",
  "groupPanel.rename": "Rename",
  "groupPanel.delete": "Delete",
  "groupPanel.nameAria": "Group name",
  "groupPanel.rowMenuAria": (p) => `Actions for ${p.label}`,
  "groupPanel.itemCountAria": (p) => `${p.count} ${plural(p.count, "item", "items")}`,
  "groupPanel.errorNameLength": (p) => `Group name must be 1–${p.max} characters.`,
  "groupPanel.errorLimit": "You cannot create any more groups.",
  "groupPanel.errorRenameGeneric": "Failed to rename. Please try again.",
  "groupPanel.errorCreateGeneric": "Failed to create the group. Please try again.",
  "groupPanel.errorDeleteGeneric": "Failed to delete the group. Please try again.",
  "groupPanel.errorReorderGeneric": "Failed to save the order. Restoring the saved order.",
  "groupPanel.confirmDelete": (p) =>
    `Delete group "${p.name}"? Its ${p.count} ${plural(p.count, "item", "items")} will also be deleted. This cannot be undone.`,
};
