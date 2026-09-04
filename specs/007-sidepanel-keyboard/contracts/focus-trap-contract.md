# Contract: focusTrap オーバーレイのフォーカス管理（新規）

対象: `src/sidepanel/focusTrap.js`（新規ファイル）

サイドパネル全面を覆うオーバーレイに対して、表示中のフォーカス閉じ込めと、閉じたときの
フォーカス復帰を担う。全グループパネルと項目登録フォームの双方から使う。

## エクスポート

```text
createFocusTrap(overlayEl: HTMLElement, options?: Options): FocusTrap
```

## Options

```text
{
  // 復帰先が失われている場合のフォールバック。要素を返す関数で渡す
  // （呼び出し時点で解決したいため。ボタンが再描画で作り直される可能性がある）
  fallbackFocus?: () => HTMLElement | null,
}
```

## FocusTrap

```text
{
  activate(returnFocusTo?: HTMLElement | null): void,
  deactivate(): void,
  isActive(): boolean,
}
```

---

## activate(returnFocusTo)

### 振る舞い

1. `returnFocusTo` を復帰先として記憶する。省略または `null` の場合は
   `document.activeElement` を記憶する。
2. `document` の `keydown` を捕らえる状態にする（`capture` フェーズで受け、`Tab` のみを扱う）。
3. 既に有効な場合は何もしない（二重に有効化しない）。

`activate` はフォーカスの移動を行わない。オーバーレイ内の初期フォーカスは呼び出し側の責務
（全グループパネルは絞り込み入力、項目登録フォームは名前欄。いずれも既存実装のまま）。

---

## Tab の扱い（有効な間）

1. `Tab` 以外のキーは何もしない。
2. オーバーレイ内のフォーカス可能な要素を、その時点で毎回求める。要素の増減（縦リストの行数、
   インライン編集の有無）を追う必要がないようにするため。
3. フォーカス可能な要素が0件のときは `preventDefault()` のみを行い、フォーカスを動かさない。
4. `Tab`（順方向）で、現在のフォーカスが**最後の要素**にある場合は `preventDefault()` して
   **最初の要素**へフォーカスを移す。
5. `Shift` + `Tab`（逆方向）で、現在のフォーカスが**最初の要素**にある場合は `preventDefault()` して
   **最後の要素**へフォーカスを移す。
6. 現在のフォーカスがオーバーレイの外にある場合は `preventDefault()` して、順方向なら最初の要素、
   逆方向なら最後の要素へ移す。
7. 上記以外（オーバーレイ内の中間の要素にフォーカスがある）は何もしない。ブラウザの既定の
   タブ移動に任せる。

### フォーカス可能な要素の判定

`overlayEl.querySelectorAll()` で以下のセレクタに一致する要素を取り、DOM順に並べる。

```text
a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),
textarea:not([disabled]), [tabindex]:not([tabindex="-1"])
```

そのうち、以下を除外する。

- `hidden` 属性を持つ要素、または `hidden` 属性を持つ祖先の中にある要素
- `offsetParent` が `null` の要素（`display: none` を含む非表示。ただし `overlayEl` 自身が
  非表示のときは対象外なので、有効化中は問題にならない）

---

## deactivate()

### 振る舞い

1. `keydown` の捕捉を解除する。
2. 記憶していた復帰先が `document` に含まれている場合、その要素へ `focus()` する。
3. 含まれていない場合（再描画で作り直された、グループ削除で行が消えた等）、
   `options.fallbackFocus()` の戻り値へ `focus()` する。戻り値が `null` の場合は何もしない。
4. 記憶していた復帰先を破棄する。
5. 既に無効な場合は何もしない。

---

## エラー

`createFocusTrap` および返される各メソッドは例外を投げない。`focus()` が失敗した場合
（要素が既に非表示になっている等）も、呼び出し側へ伝播させない。

---

## 呼び出し側の責務

| 箇所 | 内容 |
|------|------|
| 全グループパネル（`groupPanel.js`） | `open()` で `activate(document.activeElement)`、`close()` で `deactivate()`。`fallbackFocus` はタブバー末尾のパネルを開くボタンを返す関数 |
| 項目登録フォーム（`sidepanel.js`） | `openItemForm()` で `activate(document.activeElement)`、`closeItemForm()` で `deactivate()`。`fallbackFocus` は項目追加ボタンを返す関数 |

`fallbackFocus` を関数で受け取るのは、タブバー末尾のボタンが `renderTabs()` のたびに作り直されるため。
要素の参照を保持すると古い要素を指してしまう。

---

## 契約検証方法

DOM操作が中心のため、既存specと同方針でユニットテスト対象外とする。
[quickstart.md](../quickstart.md) の手動検証シナリオで以下を確認する。

- オーバーレイ表示中に `Tab` を繰り返してもフォーカスがオーバーレイ内を循環する
- `Shift` + `Tab` でも同様に循環する
- 閉じたときにフォーカスが開く前の要素へ戻る
- 行にフォーカスした状態でグループを削除して閉じた場合、フォールバックの要素へ戻る
- 全グループパネルと項目登録フォームの双方で同じ挙動になる
