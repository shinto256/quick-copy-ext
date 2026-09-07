// 日本語辞書。キー一覧は specs/011-sidepanel-i18n/contracts/i18n-contract.md の
// 「翻訳キー一覧」表を正とする。ja.js と en.js は同じキー集合を持つ（tests/unit/i18n.test.js で検証）。

export default {
  "header.searchPlaceholder": "項目名で検索",
  "header.maskToggle": "マスク解除",
  "header.addItem": "項目を追加",
  "header.moreMenu": "その他のメニュー",

  "tabs.ariaLabel": "グループタブ",
  "common.unassigned": "未分類",
  "tabs.openPanelButton": (p) => `▾ ${p.count}`,
  "tabs.openPanelAria": (p) => `グループ一覧を開く（全${p.count}件）`,
  "tabs.openPanelTitle": "グループ一覧",

  "selection.count": (p) => `${p.count}件選択中`,
  "selection.groupChange": "グループ変更",
  "selection.delete": "削除",
  "selection.cancel": "キャンセル",
  "selection.changeGroupLabel": "変更先グループ",
  "selection.apply": "適用",
  "selection.confirmDelete": (p) =>
    `選択した${p.count}件の項目を削除しますか？この操作は取り消せません。`,

  "itemList.empty": "登録済みの項目はありません。",
  "itemList.emptyFiltered": "該当する項目はありません。",

  "itemCard.selectAria": (p) => `${p.name}を選択`,
  "itemCard.copyAria": (p) => `${p.name}をコピー`,
  "itemCard.copyTitle": "コピー",
  "itemCard.kebabAria": (p) => `${p.name}の操作`,
  "itemCard.edit": "編集",
  "itemCard.delete": "削除",
  "itemCard.confirmDelete": (p) => `「${p.name}」を削除しますか？`,

  "itemForm.nameLabel": (p) => `名前（1〜${p.max}文字）`,
  "itemForm.valueLabel": (p) => `値（1〜${p.max}文字、複数行可）`,
  "itemForm.groupLabel": "グループ",
  "itemForm.save": "保存",
  "itemForm.cancel": "キャンセル",
  "itemForm.errorNameLength": (p) => `名前は1〜${p.max}文字で入力してください。`,
  "itemForm.errorValueLength": (p) => `値は1〜${p.max}文字で入力してください。`,
  "itemForm.errorLimit": "これ以上項目を登録できません。",
  "itemForm.errorGeneric": "保存に失敗しました。もう一度お試しください。",

  "copyStatus.success": "コピーしました",
  "copyStatus.failure": "コピーに失敗しました",

  "moreMenu.theme": "テーマ",
  "moreMenu.themeAuto": "自動",
  "moreMenu.themeLight": "ライト",
  "moreMenu.themeDark": "ダーク",
  "moreMenu.language": "言語",
  "moreMenu.languageJa": "日本語",
  "moreMenu.languageEn": "English",
  "moreMenu.select": "選択",

  "groupPanel.filterPlaceholder": "グループ名で絞り込み",
  "groupPanel.closeAria": "グループ一覧を閉じる",
  "groupPanel.empty": "該当するグループはありません。",
  "groupPanel.addButtonLabel": "＋ グループを追加",
  "groupPanel.rename": "名称変更",
  "groupPanel.delete": "削除",
  "groupPanel.nameAria": "グループ名",
  "groupPanel.rowMenuAria": (p) => `${p.label}の操作`,
  "groupPanel.itemCountAria": (p) => `${p.count}件`,
  "groupPanel.errorNameLength": (p) => `グループ名は1〜${p.max}文字で入力してください。`,
  "groupPanel.errorLimit": "グループはこれ以上作成できません。",
  "groupPanel.errorRenameGeneric": "名称の変更に失敗しました。もう一度お試しください。",
  "groupPanel.errorCreateGeneric": "グループの作成に失敗しました。もう一度お試しください。",
  "groupPanel.errorDeleteGeneric": "グループの削除に失敗しました。もう一度お試しください。",
  "groupPanel.errorReorderGeneric":
    "並び順の保存に失敗しました。表示を保存済みの状態に戻します。",
  "groupPanel.confirmDelete": (p) =>
    `グループ「${p.name}」を削除しますか？所属する項目${p.count}件もすべて削除されます。この操作は取り消せません。`,
};
