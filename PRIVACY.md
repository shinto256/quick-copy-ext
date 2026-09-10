# Quick Copy プライバシーポリシー

最終更新日: 2026-09-10

日本語版に続いて英語版を記載しています。An English version follows the Japanese version.

## 概要

Quick Copy（以下「本拡張機能」）は、ユーザーが登録した定型文字列を一覧から選び、クリップボードにコピーするためのChrome/Edge向け拡張機能です。

本拡張機能の開発者は、ユーザーに関するいかなる情報も収集しません。本拡張機能はユーザーの端末の外へデータを送信せず、開発者がユーザーの登録内容を閲覧することはできません。

## 保存されるデータ

本拡張機能は、ユーザーが拡張機能内で作成した以下のデータを端末内に保存します。

- 項目（items）: 項目ごとに、識別子（id、自動生成されるUUID）、名前（name）、値（value）、所属グループの識別子（groupId）、作成日時（createdAt）、更新日時（updatedAt）
- グループ（groups）: グループごとに、識別子と名称
- タブの並び順（tabOrder）: グループを表示する順序
- 設定（settings）: 値のマスク表示の有無（maskEnabled）、テーマ設定（theme）、表示言語（language）、最後に選択していたグループ（selectedGroupId）

項目の値（value）には、ユーザーが任意の文字列を入力できます。入力内容によっては、住所や氏名などの個人情報が含まれる場合があります。これらはユーザー自身が入力した内容であり、本拡張機能が自動的に収集するものではありません。

本拡張機能は、上記以外のデータを保存しません。閲覧履歴、閲覧中のページの内容、IPアドレス、端末情報、利用状況の統計などは一切取得しません。

## データの保存場所

上記のデータは、Chrome拡張機能のローカルストレージ領域（chrome.storage.local）にのみ保存されます。保存先はユーザーの端末内であり、開発者や第三者のサーバーに保存されることはありません。

本拡張機能は chrome.storage.sync を使用していません。そのため、保存したデータがGoogleアカウントを経由して他の端末へ同期されることはありません。

## 外部への送信と第三者提供

本拡張機能は、いかなるデータも外部に送信しません。ネットワーク通信を行うコードを含んでおらず、アクセス解析、広告配信、行動トラッキングの仕組みも組み込んでいません。表示に使用するフォントも拡張機能内に同梱しており、外部から読み込むことはありません。

したがって、Chrome ウェブストアの限定的な使用（Limited Use）の要件について、本拡張機能は以下をいずれも満たします。

- ユーザーデータを販売しません。また、承認された使用目的以外で第三者に譲渡しません。
- ユーザーデータを、本拡張機能の単一の目的（登録した定型文字列のコピー）と無関係な目的に使用または転送しません。
- ユーザーデータを、信用度の判定や融資の目的に使用または転送しません。

## 権限の利用目的

本拡張機能が要求する権限は次の2つのみです。

- storage: ユーザーが登録した項目、グループ、並び順、設定を端末内に保存するために使用します。
- sidePanel: 拡張機能のユーザーインターフェースを、ブラウザのサイドパネルとして表示するために使用します。

本拡張機能は、閲覧中のウェブサイトにアクセスするためのホスト権限（host_permissions）を要求しません。そのため、ユーザーが閲覧しているページの内容を読み取ることも、書き換えることもできません。

## クリップボードの取り扱い

ユーザーが一覧から項目を選んでコピー操作を行ったときにのみ、その項目の値をクリップボードに書き込みます。書き込みは、ユーザーの操作を起点とする場合に限られます。

本拡張機能はクリップボードの読み取りを行いません。ユーザーが他のアプリケーションでコピーした内容を取得することはありません。

## データの削除方法

保存されたデータは、次のいずれかの方法で削除できます。

- 個別に削除する: 本拡張機能のサイドパネル内で、項目またはグループを削除します。グループを削除すると、そのグループに所属する項目もあわせて削除されます。
- すべて削除する: ブラウザの拡張機能管理画面から本拡張機能を削除（アンインストール）します。これにより chrome.storage.local に保存されたデータも削除されます。

開発者はユーザーのデータを保持していないため、開発者に対してデータの削除を依頼する必要はありません。

## 本ポリシーの変更

本ポリシーの内容を変更する場合は、本ファイルを更新し、冒頭の最終更新日を改定します。重要な変更を行った場合は、Chrome ウェブストアの掲載情報でも告知します。

## お問い合わせ

本ポリシーおよび本拡張機能に関するお問い合わせは、以下のGitHubリポジトリのIssuesからお願いします。

https://github.com/shinto256/quick-copy-ext/issues

---

# Quick Copy Privacy Policy

Last updated: 2026-09-10

## Overview

Quick Copy ("the extension") is a Chrome and Edge browser extension that lets you register frequently used text snippets and copy them to the clipboard by selecting them from a list.

The developer of the extension does not collect any information about you. The extension does not send any data outside your device, and the developer cannot see what you register.

## Data Stored

The extension stores the following data, which you create inside the extension, on your own device.

- Items (items): for each item, an identifier (id, an automatically generated UUID), a name (name), a value (value), the identifier of the group it belongs to (groupId), a creation timestamp (createdAt), and an update timestamp (updatedAt)
- Groups (groups): for each group, an identifier and a name
- Tab order (tabOrder): the order in which groups are displayed
- Settings (settings): whether values are masked (maskEnabled), the theme setting (theme), the display language (language), and the group that was last selected (selectedGroupId)

You may enter any text as an item value (value). Depending on what you enter, it may contain personal information such as a postal address or a name. This content is entered by you; the extension does not collect it automatically.

The extension stores no data other than the above. It does not obtain your browsing history, the contents of the pages you visit, your IP address, device information, or usage statistics.

## Where Data Is Stored

The data listed above is stored only in the local storage area for Chrome extensions (chrome.storage.local). It is stored on your own device and is never stored on servers operated by the developer or by any third party.

The extension does not use chrome.storage.sync. Your data is therefore never synchronized to other devices through your Google account.

## No Transmission or Third-Party Sharing

The extension does not transmit any data externally. It contains no code that performs network communication, and it includes no analytics, advertising, or behavioral tracking. The font used for display is bundled with the extension and is not loaded from an external source.

Accordingly, with respect to the Chrome Web Store Limited Use requirements, the extension meets all of the following.

- It does not sell user data, and does not transfer user data to third parties for purposes other than approved use cases.
- It does not use or transfer user data for purposes unrelated to the extension's single purpose, which is copying registered text snippets.
- It does not use or transfer user data to determine creditworthiness or for lending purposes.

## Why Each Permission Is Requested

The extension requests only the following two permissions.

- storage: used to save your items, groups, ordering, and settings on your device.
- sidePanel: used to display the extension's user interface as a browser side panel.

The extension does not request host permissions (host_permissions) for accessing the websites you visit. It therefore cannot read or modify the contents of the pages you are viewing.

## Clipboard Handling

The extension writes an item's value to the clipboard only when you select that item and perform a copy action. Writing occurs only in response to your own action.

The extension does not read the clipboard. It never retrieves content that you copied in other applications.

## How to Delete Your Data

You can delete the stored data in either of the following ways.

- Delete individually: remove an item or a group from within the extension's side panel. Deleting a group also deletes the items that belong to it.
- Delete everything: uninstall the extension from your browser's extensions management page. This also removes the data saved in chrome.storage.local.

Because the developer does not hold your data, there is no need to request deletion from the developer.

## Changes to This Policy

If this policy changes, this file will be updated and the last updated date shown at the top will be revised. Significant changes will also be announced in the Chrome Web Store listing.

## Contact

For questions about this policy or about the extension, please open an issue in the GitHub repository below.

https://github.com/shinto256/quick-copy-ext/issues
