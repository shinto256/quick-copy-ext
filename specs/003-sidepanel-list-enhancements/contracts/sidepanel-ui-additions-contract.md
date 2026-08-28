# Contract: サイドパネルUI追加要素契約

対象: `src/sidepanel/sidepanel.html` / `sidepanel.css` / `sidepanel.js`
（002-side-panel-uiの既存契約 `specs/002-side-panel-ui/contracts/sidepanel-behavior-contract.md`
に対する追加分）

## ヘッダー「その他メニュー」

- ヘッダーに縦三点(⋮)等の「その他メニュー」操作要素を追加する。
- メニュー内に以下を含む:
  - テーマ設定: 「自動」「ライト」「ダーク」の3択（現在の設定が分かる表示、例: チェック/強調）
  - 「選択」: 選択モードを開始する操作

## テーマ設定

- テーマ選択操作で`settingsRepository.setTheme()`を呼び出し、即座に`document.documentElement`
  へ`data-theme`属性（`"light"` / `"dark"`。`"auto"`選択時は属性を削除）を反映する。
- `data-theme[hidden]`と同様、CSS側は`[[data-model]]`の契約に従い、システム設定より
  `data-theme`属性を優先する。

## 並び替え(ドラッグ&ドロップ／上下移動)

- 検索キーワードが空の場合のみ、各カードに`draggable="true"`を付与し、ドラッグ&ドロップによる
  並び替えを可能にする。検索キーワードが空でない場合は`draggable`を付与しない。
- 各カードのケバブメニューに「上へ移動」「下へ移動」を追加する。検索キーワードが空でない場合、
  これらのメニュー項目自体を表示しない（FR-004準拠）。
- ドロップ確定時・上下移動選択時、対象グループの新しい順序を`itemRepository.reorderGroup()`に
  渡して永続化し、一覧を再描画する。

## 選択モード・一括削除

- 「選択」操作でヘッダー/一覧領域が選択モード表示に切り替わる: 各カードにチェックボックスが
  表示され、ヘッダー付近に「選択件数」「削除」「キャンセル」の操作要素を表示する。
- 「削除」操作（選択件数1件以上の場合のみ有効）で確認ダイアログを表示し、承認後
  `itemRepository.removeMany()`を呼び出して一覧を再描画し、選択モードを終了する。
- 「キャンセル」操作、タブ切替、検索キーワード入力のいずれかが発生した場合、選択状態を破棄し
  選択モードを終了する(通常のカード表示に戻る)。

## 契約検証方法

- 手動検証: `quickstart.md`の手順に従い、拡張機能を読み込みドラッグ&ドロップ/上下移動での
  並び替え、テーマの手動固定、選択モードでの一括削除が行えることを確認する。
- 自動検証: `itemRepository`の`reorderGroup`/`removeMany`、`settingsRepository`の`setTheme`は
  ユニットテスト対象（`contracts/item-repository-additions.md`,
  `contracts/settings-repository-additions.md`）。DOM組み立て自体(`sidepanel.js`)は
  002-side-panel-uiと同方針でユニットテスト対象外とし、手動検証で担保する。
