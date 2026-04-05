# nasne Desktop

nasne と通信する Electron + React + TypeScript 製のデスクトップアプリです。

## 機能

- 📼 **録画一覧** — 録画済み番組の一覧表示・削除・検索
- 📅 **録画予約** — 予約の一覧・新規追加・削除
- 💾 **ストレージ** — 内蔵/外付け HDD の使用状況
- 📡 **ライブ視聴** — デバイス状態の確認・対応アプリへの案内

## セットアップ

### 前提条件

- Node.js v18 以上
- nasne (Buffalo 製 NS-N100 または Sony 製) と同一ネットワーク上にいること

### インストール

```bash
cd nasne-desktop
npm install
```

### 開発モードで起動

```bash
npm run dev
```

### アプリをビルド (配布用)

```bash
# macOS
npm run package:mac

# Windows
npm run package:win
```

ビルド成果物は `dist/` フォルダに出力されます。

## 使い方

1. アプリを起動すると IP アドレス入力画面が表示されます
2. nasne の IP アドレスを入力して「接続する」をクリック
3. サイドバーから各機能に切り替えられます

### nasne の IP アドレスを調べる方法

- ルーターの管理画面 → 接続デバイス一覧
- `http://<nasne_ip>/` (nasne HOME) のネットワーク設定
- Buffalo nasne の場合: nasne アクセスツールを使う

## アーキテクチャ

```
src/
├── main/           Electron メインプロセス
│   └── index.ts   ウィンドウ生成 + nasne HTTP リクエスト (IPC ハンドラ)
├── preload/        IPC ブリッジ
│   └── index.ts   window.electronAPI を renderer に公開
└── renderer/       React フロントエンド
    └── src/
        ├── api/
        │   └── nasne.ts       nasne API クライアント (全エンドポイント)
        ├── components/
        │   ├── Sidebar.tsx
        │   ├── RecordingList.tsx
        │   ├── ReservationList.tsx
        │   ├── StorageInfo.tsx
        │   └── LiveView.tsx
        ├── styles/
        │   └── global.css
        └── App.tsx
```

### なぜ IPC 経由で HTTP リクエストするのか

Electron の renderer (Chromium) から直接 `http://192.168.x.x:64220/...` を叩くと
CORS エラーになる場合があります。そのため、Node.js 側の **main プロセス**で
`http.request()` を使い、IPC (`ipcMain.handle`) 経由で結果を返しています。

## nasne API リファレンス (主なエンドポイント)

| ポート | エンドポイント | 説明 |
|--------|--------------|------|
| 64220  | `GET /recorded/titleListGet` | 録画一覧取得 |
| 64220  | `POST /recorded/titleDelete` | 録画削除 |
| 64220  | `GET /schedule/reservedListGet` | 予約一覧取得 |
| 64220  | `POST /schedule/reservedInfoCreate` | 予約作成 |
| 64220  | `POST /schedule/reservedInfoDelete` | 予約削除 |
| 64210  | `GET /status/HDDInfoGet` | HDD 情報取得 |
| 64210  | `GET /status/boxStatusListGet` | ボックス状態取得 |
| 64210  | `GET /status/boxNameGet` | ボックス名取得 |

## ライブ視聴について

nasne のライブストリーミングは **DTCP-IP** (デジタル著作権管理) で保護されています。
このアプリから直接映像を表示することはできません。
ライブ視聴には以下の対応アプリをお使いください:

- **Infuse** (iOS / macOS)
- **torne mobile** (iOS / Android)
- **Video & TV SideView** (Sony 純正)

## 参考

- [地デジ](http://soranikakaruhashi.blog.fc2.com/blog-entry-71.html)
- [BS](http://soranikakaruhashi.blog.fc2.com/blog-entry-36.html)
- [デジタル放送に使用する 番組配列情報 標準規格 ARIB  STD-B10 5.3版](https://web.archive.org/web/20140427183421if_/http://www.arib.or.jp/english/html/overview/doc/2-STD-B10v5_3.pdf#page=153)
- [ソニーが基本的に好き!](https://kunkoku.jp/playstation4torne.html)

## ライセンス

MIT
