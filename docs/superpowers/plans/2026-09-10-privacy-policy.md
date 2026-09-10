# プライバシーポリシー 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome Web Storeに登録する公開プライバシーポリシーとして、リポジトリ直下に `PRIVACY.md` を作成する。

**Architecture:** 成果物は単一のMarkdown文書。日本語セクションと同内容の英語セクションを1ファイルに併記する。本文の章立てと記載内容は設計書 `docs/superpowers/specs/2026-09-10-privacy-policy-design.md` の「章立て」節を唯一の出典とし、本計画では文面を再掲せず、代わりに実装（`manifest.json` と `src/storage/`）との整合を機械的に検証する必須文字列アサーションを定義する。文面を二重管理すると設計書と乖離するため。

**Tech Stack:** Markdown のみ。ビルド・依存追加なし。検証は `git bash` 上の `grep` で行う。

## Global Constraints

- ファイルパスは リポジトリ直下 `PRIVACY.md`（設計書の決定事項より）。
- 記載言語は日英併記。日本語セクションを先に置き、英語セクションを後に置く。
- 文体は通常の日本語・英語。圧縮した文体（体言止め・助詞省略）は使わない。
- 問い合わせ先は `https://github.com/shinto256/quick-copy-ext/issues` のみ。メールアドレスは記載しない。
- 最終更新日は `2026-09-10` を本文冒頭に記載する。バージョン番号は付けない。
- 作業ブランチは既存の `docs/privacy-policy`（設計書のコミット `7f5a809` が載っている）。
- `git push` と Pull Request の作成は本計画に含めない。ユーザーの明示的な指示を待つ。

---

### Task 1: PRIVACY.md の作成と実装整合の検証

**Files:**
- Create: `PRIVACY.md`
- Reference (変更しない): `manifest.json`, `src/storage/itemRepository.js`, `src/storage/groupRepository.js`, `src/storage/settingsRepository.js`, `src/storage/storageClient.js`
- Source of truth for content: `docs/superpowers/specs/2026-09-10-privacy-policy-design.md` の「章立て」節（全9章）

**Interfaces:**
- Consumes: なし（本計画の最初のタスク）
- Produces: リポジトリ直下の `PRIVACY.md`。公開URL `https://github.com/shinto256/quick-copy-ext/blob/main/PRIVACY.md` として、後続のChrome Web Store提出作業（本計画のスコープ外）から参照される。

- [ ] **Step 1: 記載すべき事実を実装から確定する（文面作成前に必ず実行）**

ストレージキーの一覧を取得する。

```bash
grep -rn "const KEY\|ORDER_KEY = " src/storage/
```

Expected（4件。この4キーが本文の章2に漏れなく登場しなければならない）:

```
src/storage/groupRepository.js:6:const KEY = "groups";
src/storage/groupRepository.js:7:const ORDER_KEY = "tabOrder";
src/storage/itemRepository.js:4:const KEY = "items";
src/storage/settingsRepository.js:4:const KEY = "settings";
```

`settings` の内訳を取得する。

```bash
grep -n "DEFAULT_SETTINGS = " src/storage/settingsRepository.js
```

Expected（4項目すべてが章2に登場しなければならない）:

```
src/storage/settingsRepository.js:5:const DEFAULT_SETTINGS = { maskEnabled: true, theme: "auto", language: "ja", selectedGroupId: null };
```

要求している権限を確定する。

```bash
node -e "const m=require('./manifest.json'); console.log('permissions:', m.permissions); console.log('host_permissions:', m.host_permissions)"
```

Expected（`host_permissions` が `undefined` であることが、章5の「ホスト権限は要求しない」記述の根拠）:

```
permissions: [ 'storage', 'sidePanel' ]
host_permissions: undefined
```

外部通信コードが存在しないことを確認する。

```bash
grep -rn "fetch(\|XMLHttpRequest\|navigator.sendBeacon" src/ ; echo "exit=$?"
```

Expected（一致なし。章4の「ネットワーク通信を行うコードを含まない」記述の根拠）:

```
exit=1
```

- [ ] **Step 2: 検証スクリプトを先に書いて失敗させる（TDDの失敗確認に相当）**

`PRIVACY.md` にこの後書く内容が、Step 1 で確定した事実を漏れなく含むことを検査するワンライナーを用意する。ファイルがまだ存在しないので、この時点では必ず失敗する。

```bash
for s in "items" "groups" "tabOrder" "settings" "maskEnabled" "theme" "language" "selectedGroupId" "chrome.storage.local" "chrome.storage.sync" "sidePanel" "https://github.com/shinto256/quick-copy-ext/issues" "2026-09-10"; do grep -qF -- "$s" PRIVACY.md || echo "MISSING: $s"; done
```

Expected（ファイル未作成のため全項目がMISSINGとして出る、または `No such file` エラー）:

```
grep: PRIVACY.md: No such file or directory
MISSING: items
...（以下全項目）
```

- [ ] **Step 3: PRIVACY.md を作成する**

設計書 `docs/superpowers/specs/2026-09-10-privacy-policy-design.md` の「章立て」節に沿って、全9章を日本語セクションで記述し、同一の章立てで英語セクションを続ける。

日本語セクションの見出し（この順序・この構成で書く）:

1. `## 概要`
2. `## 保存されるデータ`
3. `## データの保存場所`
4. `## 外部への送信と第三者提供`
5. `## 権限の利用目的`
6. `## クリップボードの取り扱い`
7. `## データの削除方法`
8. `## 本ポリシーの変更`
9. `## お問い合わせ`

英語セクションの見出し（`---` で区切った後、同順で対応させる）:

1. `## Overview`
2. `## Data Stored`
3. `## Where Data Is Stored`
4. `## No Transmission or Third-Party Sharing`
5. `## Why Each Permission Is Requested`
6. `## Clipboard Handling`
7. `## How to Delete Your Data`
8. `## Changes to This Policy`
9. `## Contact`

内容面で必ず満たすこと（Step 1 の実測値に基づく）:

- 章2で `items`（`id` / `name` / `value` / `groupId` / `createdAt` / `updatedAt`）、`groups`、`tabOrder`、`settings`（`maskEnabled` / `theme` / `language` / `selectedGroupId`）をすべて列挙する。
- 章2で「`value` にはユーザーが任意の文字列を入力でき、住所などの個人情報が含まれる場合がある」旨を明記する。
- 章3で `chrome.storage.local` のみを使用する旨と、`chrome.storage.sync` を使用していないためGoogleアカウント経由で他端末に同期されない旨を明記する。
- 章4でChrome Web StoreのLimited Use要件に対応する3点（データを販売しない / 単一用途と無関係な目的に使用または転送しない / 信用度の判定や融資の目的に使用または転送しない）を明記する。
- 章5で `storage` は登録データと設定の保存、`sidePanel` はUIの表示にのみ使う旨と、ホスト権限を要求しない旨を明記する。
- 章9の連絡先は `https://github.com/shinto256/quick-copy-ext/issues` のみとし、メールアドレスは書かない。
- 冒頭に `最終更新日: 2026-09-10` を置く。

- [ ] **Step 4: 検証スクリプトを再実行して通ることを確認する**

```bash
for s in "items" "groups" "tabOrder" "settings" "maskEnabled" "theme" "language" "selectedGroupId" "chrome.storage.local" "chrome.storage.sync" "sidePanel" "https://github.com/shinto256/quick-copy-ext/issues" "2026-09-10"; do grep -qF -- "$s" PRIVACY.md || echo "MISSING: $s"; done; echo "check done"
```

Expected（MISSING行が1行も出ないこと）:

```
check done
```

メールアドレスと会社ドメインが混入していないことを確認する。

```bash
grep -n "@\|fixer.co.jp" PRIVACY.md ; echo "exit=$?"
```

Expected（一致なし。`@` を含む記述を入れてしまった場合はここで気づける）:

```
exit=1
```

日英の章数が一致していることを確認する。

```bash
grep -c "^## " PRIVACY.md
```

Expected（9章 × 2言語）:

```
18
```

- [ ] **Step 5: 既存テストが壊れていないことを確認する**

Markdownの追加のみだが、リポジトリの健全性を確認する。

```bash
npm test
```

Expected: 全テストがパスする（`PRIVACY.md` はテスト対象外なので件数は変わらない）。

- [ ] **Step 6: コミットする**

```bash
git add PRIVACY.md
git commit -m "docs: プライバシーポリシーを追加

Chrome Web Store提出時に登録する公開プライバシーポリシー。
保存項目・保存場所・権限の利用目的を実装に基づいて明示し、
外部送信および第三者提供を行わないことを日英併記で記載する。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: 公開URLが成立する条件を確認して報告する**

`git push` は行わない。以下を確認し、ユーザーに次アクションを提示する。

```bash
git log --oneline -2 && git status --short
```

Expected: コミット2件（設計書とポリシー本体）、作業ツリーがクリーン。

報告内容: `PRIVACY.md` は `docs/privacy-policy` ブランチ上にあり、Chrome Web Storeに登録する
`https://github.com/shinto256/quick-copy-ext/blob/main/PRIVACY.md` が有効になるのは
`main` にマージした後であること。push とマージの判断はユーザーに委ねる。

---

## スコープ外

設計書の「スコープ外」節と同一。以下は本計画では扱わない。

- Chrome Web Store Developer Dashboard 上のデータ使用に関する開示フォームの記入
- ストア掲載情報（説明文、スクリーンショット、プロモーション用タイル画像）
- `manifest.json` の `default_locale` 設定とストア掲載情報の多言語化
- リリースバージョン（`0.1.0`）の見直し
- LICENSE ファイルの追加
