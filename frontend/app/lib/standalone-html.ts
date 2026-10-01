import type { DiarizationResult } from "./diarization";

type ViewerExport = {
  result: DiarizationResult;
  recordingName: string;
  audioOnly: boolean;
  colors: readonly string[];
};

export function createViewerHtml(data: ViewerExport) {
  // Escape HTML-sensitive characters before placing JSON inside a script tag.
  const payload = JSON.stringify(data).replace(/[<>&\u2028\u2029]/g,
    (character) => "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"));

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>話者分離ビューアー</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#142139;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1024px;margin:auto;padding:32px 24px}header{display:flex;align-items:center;gap:12px;margin-bottom:20px}.icon{display:grid;place-items:center;width:40px;height:40px;border-radius:8px;background:#6366f11a;color:#6366f1}h1{margin:0;font-size:18px}h2{margin:0;font-size:14px;font-weight:500}p{margin:0}.muted{color:#64748b;font-size:12px}.subtitle{margin-top:6px;overflow-wrap:anywhere}.card{margin-top:20px;border:1px solid #e2e8f0;border-radius:12px;background:white;overflow:hidden}video{display:block;aspect-ratio:16/9;max-height:440px;width:100%;background:black;object-fit:contain}audio{display:block;width:100%;padding:16px}.status{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:12px 16px;font-size:12px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.active-speakers{display:flex;align-items:center;flex-wrap:wrap;gap:12px}.speaker{display:inline-flex;align-items:center;gap:6px}.dot{display:inline-block;width:8px;height:8px;flex-shrink:0;border-radius:50%}.timeline-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px}.zoom-controls{display:flex;align-items:center;gap:4px}button{font:inherit;cursor:pointer}button:focus-visible{outline:2px solid #6366f1;outline-offset:2px}.zoom-controls button{width:28px;height:28px;border:0;border-radius:6px;background:white;color:#64748b;font-size:20px}.zoom-controls button:hover{background:#f1f5f9}.zoom-controls button:disabled{cursor:default;opacity:.35}#zoom-value{width:32px;text-align:center;color:#64748b;font-size:12px}.timeline-body{display:flex;border-top:1px solid #e2e8f0}.labels{width:128px;flex-shrink:0;border-right:1px solid #e2e8f0}.label{display:flex;align-items:center;gap:8px;height:56px;padding:0 16px;border-top:1px solid #e2e8f0;font-size:12px}.label-spacer{height:32px}.viewport{min-width:0;flex:1;overflow-x:auto}.content{position:relative;min-width:480px;width:100%}.ruler{position:relative;height:32px;background:#f8fafc}.tick{position:absolute;top:8px;color:#64748b;font-size:10px;transform:translateX(-50%)}.tick:first-child{transform:translateX(4px)}.tick:last-child{transform:translateX(-110%)}.track{position:relative;height:56px;border-top:1px solid #e2e8f0}.track:nth-of-type(even){background:#f8fafc99}.grid{position:absolute;inset:0;pointer-events:none}.grid-line{position:absolute;top:0;bottom:0;border-left:1px solid #e2e8f099}.segment{position:absolute;top:16px;height:24px;padding:0;border:0;border-radius:2px;opacity:.8}.segment:hover,.segment.active{z-index:2;opacity:1}.segment.active{outline:2px solid #1e293b;outline-offset:2px}#playhead{position:absolute;top:0;bottom:0;z-index:3;width:1px;background:#0f172a;pointer-events:none}#playhead:before{content:"";position:absolute;left:-3px;top:28px;width:6px;height:6px;background:#0f172a;transform:rotate(45deg)}.hint{border-top:1px solid #e2e8f0;padding:12px 16px;line-height:1.6}.file-hint{margin-top:16px;line-height:1.7;overflow-wrap:anywhere}#error{margin-top:16px;color:#dc2626;font-size:13px;line-height:1.7}@media(max-width:639px){main{padding:24px 16px}.labels{width:96px}.label{padding:0 12px;font-size:11px}}
  </style>
</head>
<body>
<main>
  <header>
    <span class="icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4"/></svg></span>
    <div><h1>話者分離ビューアー</h1><p id="subtitle" class="muted subtitle"></p></div>
  </header>
  <section class="card" aria-label="録音と発話中の話者">
    <div id="player"></div>
    <div class="status"><span id="time" class="muted mono"></span><div class="active-speakers"><span class="muted">発話中</span><div id="speakers" class="active-speakers"></div></div></div>
  </section>
  <p id="error" role="alert" hidden></p>
  <section class="card" aria-label="話者ごとのタイムライン">
    <div class="timeline-header"><h2>話者タイムライン</h2><div class="zoom-controls"><button id="zoom-out" aria-label="タイムラインを縮小">−</button><span id="zoom-value" class="mono">1×</span><button id="zoom-in" aria-label="タイムラインを拡大">＋</button></div></div>
    <div class="timeline-body"><div id="labels" class="labels"><div class="label-spacer"></div></div><div id="viewport" class="viewport"><div id="content" class="content"><div id="ruler" class="ruler"></div><div id="playhead"></div></div></div></div>
    <p class="hint muted">区間をクリックすると、その位置から再生します。</p>
  </section>
  <p id="file-hint" class="file-hint muted"></p>
</main>
<script id="viewer-data" type="application/json">${payload}</script>
<script>
(() => {
  const { result, recordingName, audioOnly, colors } = JSON.parse(document.getElementById('viewer-data').textContent);
  const duration = result.metadata.total_duration_sec;
  const speakers = result.metadata.speakers;
  const formatTime = (seconds) => {
    const whole = Math.floor(Math.max(0, seconds));
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const sec = whole % 60;
    return (hours ? String(hours).padStart(2, '0') + ':' : '') + String(minutes).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };
  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const speakerLabel = (name, index) => {
    const label = create('span', 'speaker mono');
    const dot = create('span', 'dot');
    dot.style.background = colors[index % colors.length];
    label.append(dot, create('span', '', name));
    return label;
  };
  document.getElementById('subtitle').textContent = recordingName + ' · ' + speakers.length + '話者 · ' + formatTime(duration);
  document.getElementById('file-hint').textContent = 'このHTMLと「' + recordingName + '」を同じフォルダに置いて開いてください。話者分離結果はHTMLに保存されています。';
  const error = document.getElementById('error');
  const showError = (message) => { error.textContent = message; error.hidden = false; };
  const media = create(audioOnly ? 'audio' : 'video');
  media.controls = true;
  media.preload = 'metadata';
  media.playsInline = true;
  media.setAttribute('aria-label', '録音プレイヤー');
  media.src = './' + encodeURIComponent(recordingName);
  document.getElementById('player').append(media);
  const viewport = document.getElementById('viewport');
  const content = document.getElementById('content');
  const ruler = document.getElementById('ruler');
  const grids = [];
  const buttons = [];
  let zoom = 1;
  let pendingSeek = null;
  const update = (time) => {
    document.getElementById('time').textContent = formatTime(time) + ' / ' + formatTime(duration);
    document.getElementById('playhead').style.left = Math.min(100, time / duration * 100) + '%';
    const active = new Set();
    for (const { segment, button } of buttons) {
      const playing = segment.start <= time && segment.end > time;
      button.classList.toggle('active', playing);
      if (playing) active.add(segment.speaker);
    }
    document.getElementById('speakers').replaceChildren(...(active.size
      ? speakers.filter((name) => active.has(name)).map((name) => speakerLabel(name, speakers.indexOf(name)))
      : [create('span', 'muted', '—')]));
    const position = time / duration * content.clientWidth;
    if (position < viewport.scrollLeft || position > viewport.scrollLeft + viewport.clientWidth - 12) viewport.scrollLeft = Math.max(0, position - viewport.clientWidth / 3);
  };
  const seek = async (time) => {
    update(time);
    if (media.readyState === 0) { pendingSeek = time; return; }
    media.currentTime = time;
    try { await media.play(); error.hidden = true; }
    catch { showError('プレイヤーの再生ボタンを押して再生してください。'); }
  };
  speakers.forEach((name, index) => {
    const label = create('div', 'label');
    label.append(speakerLabel(name, index));
    document.getElementById('labels').append(label);
    const track = create('div', 'track');
    const grid = create('div', 'grid');
    track.append(grid);
    grids.push(grid);
    result.segments.filter((segment) => segment.speaker === name).forEach((segment) => {
      const button = create('button', 'segment');
      button.style.left = segment.start / duration * 100 + '%';
      button.style.width = 'max(2px, ' + (segment.end - segment.start) / duration * 100 + '%)';
      button.style.background = colors[index % colors.length];
      button.title = name + ' · ' + segment.start.toFixed(2) + '–' + segment.end.toFixed(2) + '秒 · 信頼度 ' + (segment.confidence * 100).toFixed(1) + '%';
      button.setAttribute('aria-label', name + ' ' + segment.start.toFixed(2) + '秒から再生');
      button.addEventListener('click', () => seek(segment.start));
      track.append(button);
      buttons.push({ segment, button });
    });
    content.append(track);
  });
  const drawTicks = () => {
    ruler.replaceChildren();
    grids.forEach((grid) => grid.replaceChildren());
    for (let index = 0; index <= 8 * zoom; index++) {
      const left = index / (8 * zoom) * 100 + '%';
      const tick = create('span', 'tick mono', formatTime(index * duration / (8 * zoom)));
      tick.style.left = left;
      ruler.append(tick);
      grids.forEach((grid) => { const line = create('span', 'grid-line'); line.style.left = left; grid.append(line); });
    }
    content.style.width = zoom * 100 + '%';
    document.getElementById('zoom-value').textContent = zoom + '×';
    document.getElementById('zoom-out').disabled = zoom === 1;
    document.getElementById('zoom-in').disabled = zoom === 8;
    update(media.currentTime);
  };
  document.getElementById('zoom-out').addEventListener('click', () => { if (zoom > 1) { zoom /= 2; drawTicks(); } });
  document.getElementById('zoom-in').addEventListener('click', () => { if (zoom < 8) { zoom *= 2; drawTicks(); } });
  media.addEventListener('timeupdate', () => update(media.currentTime));
  media.addEventListener('loadedmetadata', () => { if (pendingSeek !== null) { const time = pendingSeek; pendingSeek = null; seek(time); } });
  media.addEventListener('error', () => showError('「' + recordingName + '」をこのHTMLと同じフォルダに置いてください。再生できない場合は、ファイル形式とブラウザーの対応を確認してください。'));
  drawTicks();
})();
</script>
</body>
</html>`;
}
