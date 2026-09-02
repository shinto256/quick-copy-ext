# Contract: サイドパネルUI追加要素契約

対象: `src/sidepanel/sidepanel.html` / `sidepanel.css` / `sidepanel.js`
（`003-sidepanel-list-enhancements`の既存契約
`specs/003-sidepanel-list-enhancements/contracts/sidepanel-ui-additions-contract.md`に対する
追加分）

## 選択モード中のカード個別操作の無効化

- 選択モード(`selectionMode === true`)が有効な間、各カードのコピーボタン・三点リーダーボタンに
  `disabled`属性を付与する。両ボタンとも既存のイベントハンドラは変更せず、`disabled`によって
  クリックイベントが発火しない状態にする。
- チェックボックスの選択・解除操作自体は`disabled`にせず、選択モード中も通常どおり操作できる。
- `startSelectionMode()`実行時、既存の`openItemMenuId`を`null`にリセットしてから一覧を再描画する。
  これにより、選択モード開始前に開いていた個別メニュー(編集・削除)は自動的に閉じる。
- 選択モードを終了(キャンセル/選択解除、一括削除完了、グループ一括変更完了、タブ切替、検索実行の
  いずれか)した場合、コピーボタン・三点リーダーボタンの`disabled`を解除する。

## 選択ツールバーの「グループ変更」操作

- 既存の選択ツールバー(`#selection-toolbar`)内、削除ボタンと並べて「グループ変更」ボタンを追加する。
  選択件数が0件の場合はこのボタンを`disabled`にする(既存の削除ボタンと同じ扱い)。
- 「グループ変更」ボタン押下で、既存のグループ選択ロジック(項目編集フォームの
  `populateGroupSelect`相当。未分類を含むグループ一覧を`<select>`に描画)を再利用したポップオーバーを
  表示する。ポップオーバーには変更先グループの`<select>`、「適用」ボタン、「キャンセル」ボタンを含む。
- 「適用」実行時、選択中の全項目ID(`selectedItemIds`)と選択された変更先グループIDを
  `itemRepository.updateGroupMany()`に渡し、完了後に一覧・グループタブの絞り込み表示を再描画し、
  選択モードを終了する(既存の一括削除完了時と同じ終了処理)。
- 「キャンセル」実行時、`itemRepository`は呼び出さず、ポップオーバーを閉じるのみで選択状態・
  選択モードは維持する。
- 選択モードがタブ切替・検索実行によってリセットされた場合、ポップオーバーが開いていれば同時に
  閉じる。

## 契約検証方法

- 手動検証: `quickstart.md`の手順に従い、拡張機能を読み込み、選択モード中のコピー/三点リーダー
  無効化と、選択項目のグループ一括変更が行えることを確認する。
- 自動検証: `itemRepository.updateGroupMany()`はユニットテスト対象
  （`contracts/item-repository-additions.md`）。DOM組み立て自体(`sidepanel.js`)は既存specと同方針で
  ユニットテスト対象外とし、手動検証で担保する。
