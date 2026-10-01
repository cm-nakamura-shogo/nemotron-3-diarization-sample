# Nemotron-3 Diarization Sample

[nvidia/Nemotron-3-Diarization](https://huggingface.co/nvidia/Nemotron-3-Diarization) を使って、手元のMacで話者分離を行うサンプルです。
推論スクリプト（`run.py`）と、結果を確認するためのRemix + shadcn/ui のビューアー（`frontend/`）が含まれます。

音声・動画ファイルは含まれていません。お手元のファイルを用意してください。

## 話者分離の実行

[uv](https://docs.astral.sh/uv/) で環境を構築します。

```sh
uv sync
uv run python run.py recording.webm -o diarization_result.json
```

`.webm`、`.mp4`、`.wav`、`.mp3`、`.m4a` などを入力できます。
推論デバイスは MPS → CUDA → CPU の順に自動で選択されます。`--device cpu` のように指定することもできます。

## ビューアー

Node.js 22.18 以上で起動します。

```sh
cd frontend
npm install
npm run dev -- --audio ../recording.webm --json ../diarization_result.json
```

http://localhost:5173 を開くと、録音と話者ごとのタイムラインを表示します。
発話区間をクリックすると、その位置から再生します。
タイムラインの `+` / `−` で拡大・縮小できます。

画面右上の「HTMLダウンロード」で、プレイヤーと話者分離結果を1つのHTMLに保存できます。
ダウンロードしたHTMLと、指定した音声・動画ファイルを同じフォルダに置いて開いてください。
保存したHTMLの閲覧にNode.jsや元のJSONは不要です。

`--audio` と `--json` には任意のファイルを指定できます。
相対パスはコマンドを実行したディレクトリが基準です（npmスクリプトでは `frontend/`）。
省略時はリポジトリ直下の `recording.webm` と `diarization_result.json` を読み込みます。
推論をやり直した場合は、ブラウザーを再読み込みしてください。

```sh
npm run typecheck
npm run build
npm start -- --audio ../recording.webm --json ../diarization_result.json
```

ビルド後は、リポジトリ直下からNode.jsで直接起動することもできます。

```sh
node frontend/server.mjs --audio ./recording.webm --json ./diarization_result.json
```

`--dev` を付けると開発サーバー、`--port 5174` を付けるとポートを変更できます。
