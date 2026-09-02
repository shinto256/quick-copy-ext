# Data Model: 選択項目グループ一括変更・選択モード中の個別操作制限

## 既存エンティティへの変更

### Item（項目）— スキーマ変更なし

`specs/001-quick-copy-items/data-model.md`で定義済みのフィールド（`id` / `name` / `value` /
`groupId` / `createdAt` / `updatedAt`）は変更しない。グループ一括変更は既存の`groupId`フィールドを
対象に、複数項目を一度に更新する操作である（[[research]] 1参照）。

- 一括グループ変更後の項目は、既存`update()`のグループ変更時の挙動（変更後グループの末尾に配置、
  `specs/003-sidepanel-list-enhancements/spec.md`のFR-005準拠）と同じ規則で、変更先グループ内の
  末尾に配置される。

## 本UIで新たに扱う画面内一時状態（非永続）

既存(`003-sidepanel-list-enhancements`)の`selectionMode` / `selectedItemIds`はそのまま利用する。
本specで新たに追加する一時状態は以下の1つ。

| 状態 | 型 | 説明 | ライフサイクル |
|------|-----|------|----------------|
| groupChangePopoverOpen | boolean | グループ変更ポップオーバーの表示状態 | 「グループ変更」ボタン押下でtrue、「適用」実行完了・「キャンセル」・選択モード終了(タブ切替/検索/一括削除完了/選択解除)のいずれかでfalseに戻る |

既存の`openItemMenuId`（個別メニューの表示対象ID）は、`startSelectionMode()`実行時に`null`へ
リセットする（[[research]] 3参照。Clarifications 2026-09-02 準拠）。新たな状態変数の追加は不要。

## Repository層に追加する操作

### itemRepository.updateGroupMany(ids, groupId)

- **入力**: `ids`（グループ変更対象の項目ID配列）、`groupId`（変更先。`string | null`。`null`は
  未分類）。
- **出力**: 更新後の`Item[]`全体（`ItemRepository.list()`と同じ形）。
- **副作用**: `ids`に一致する全項目の`groupId`を`groupId`に更新し、既存`update()`と同じ規則で
  変更後グループの末尾に配置する。1回の書き込みで永続化する。存在しないIDが含まれていてもエラー
  にはせず無視する（選択後に他操作で先に削除された場合に対応、[[req-000007]]の`removeMany`と
  同方針）。
