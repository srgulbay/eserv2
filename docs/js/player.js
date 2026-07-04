/* EserV2 player */
(() => {
  const A = window.ALBUM;
  const BASE = A.base; // absolute site base with trailing slash
  const tracks = A.songs;

  const audio = new Audio();
  audio.preload = "metadata";

  let idx = -1, playing = false;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const el = {
    player: $(".player"),
    fill: $(".player-seek .fill"),
    knob: $(".player-seek .knob"),
    seek: $(".player-seek"),
    nowArt: $(".now img"),
    nowTitle: $(".now-meta h4"),
    nowSub: $(".now-meta p"),
    play: $(".ctrl-play"),
    playIco: $(".ctrl-play .i-play"),
    pauseIco: $(".ctrl-play .i-pause"),
    prev: $(".ctrl-prev"),
    next: $(".ctrl-next"),
    cur: $(".time .cur"),
    dur: $(".time .dur"),
    viz: $("canvas.viz"),
    vol: $(".vol input"),
    overlay: $(".overlay"),
    ovBg: $(".overlay-bg"),
    ovArt: $(".overlay-art"),
    ovTitle: $(".overlay h3"),
    ovLyrics: $(".overlay-lyrics"),
    toast: $(".toast"),
  };

  const fmt = t => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /* ── loading & playback ── */
  function load(i, { autoplay = true } = {}) {
    idx = (i + tracks.length) % tracks.length;
    const t = tracks[idx];
    audio.src = A.audioDir + t.id + ".mp3";
    el.nowArt.src = A.artDir + t.id + ".jpeg";
    el.nowTitle.textContent = t.title;
    el.nowSub.textContent = A.artist;
    el.ovArt.src = A.artDir + t.id + ".jpeg";
    el.ovBg.style.backgroundImage = `url("${A.artDir + t.id}.jpeg")`;
    el.ovTitle.textContent = t.title;
    el.ovLyrics.textContent = t.lyrics || "";
    el.dur.textContent = fmt(t.duration);
    el.player.classList.add("visible");
    document.title = `${t.title} — ${A.title}`;
    $$(".track").forEach(r => {
      const on = r.dataset.id === t.id;
      r.classList.toggle("active", on);
    });
    try { history.replaceState(null, "", BASE + "t/" + t.slug + "/"); } catch { /* local preview */ }
    setSession(t);
    if (autoplay) play();
  }

  function play() {
    ensureViz();
    audio.play().then(() => {
      playing = true; syncUI();
    }).catch(() => { playing = false; syncUI(); });
  }
  function pause() { audio.pause(); playing = false; syncUI(); }
  const toggle = () => (playing ? pause() : (idx < 0 ? load(startIdx()) : play()));

  function syncUI() {
    el.playIco.style.display = playing ? "none" : "";
    el.pauseIco.style.display = playing ? "" : "none";
    $$(".track").forEach(r =>
      r.classList.toggle("playing", playing && r.dataset.id === tracks[idx]?.id));
  }

  audio.addEventListener("play", () => { playing = true; syncUI(); });
  audio.addEventListener("pause", () => { playing = false; syncUI(); });
  audio.addEventListener("ended", () => load(idx + 1));
  audio.addEventListener("timeupdate", () => {
    const p = (audio.currentTime / (audio.duration || 1)) * 100;
    el.fill.style.width = p + "%";
    el.knob.style.left = p + "%";
    el.cur.textContent = fmt(audio.currentTime);
    if (isFinite(audio.duration)) el.dur.textContent = fmt(audio.duration);
  });

  /* ── seek ── */
  const seekTo = e => {
    const r = el.seek.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    audio.currentTime = Math.max(0, Math.min(1, x / r.width)) * (audio.duration || 0);
  };
  let dragging = false;
  el.seek.addEventListener("pointerdown", e => {
    dragging = true; el.seek.classList.add("drag");
    el.seek.setPointerCapture(e.pointerId); seekTo(e);
  });
  el.seek.addEventListener("pointermove", e => dragging && seekTo(e));
  el.seek.addEventListener("pointerup", () => { dragging = false; el.seek.classList.remove("drag"); });

  /* ── controls ── */
  el.play.addEventListener("click", toggle);
  el.prev.addEventListener("click", () => (audio.currentTime > 4 ? (audio.currentTime = 0) : load(idx - 1)));
  el.next.addEventListener("click", () => load(idx + 1));
  el.vol?.addEventListener("input", () => {
    audio.volume = el.vol.value / 100;
    el.vol.style.setProperty("--vol", el.vol.value + "%");
  });

  document.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea")) return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    if (e.code === "ArrowRight") audio.currentTime += 5;
    if (e.code === "ArrowLeft") audio.currentTime -= 5;
    if (e.code === "KeyN") load(idx + 1);
    if (e.code === "KeyP") load(idx - 1);
    if (e.code === "Escape") el.overlay.classList.remove("open");
  });

  /* ── track rows ── */
  $$(".track").forEach(row => {
    row.addEventListener("click", e => {
      if (e.target.closest(".icon-btn")) return;
      const i = +row.dataset.index;
      if (i === idx) toggle(); else load(i);
    });
    $(".share", row)?.addEventListener("click", () => share(tracks[+row.dataset.index]));
    $(".lyr", row)?.addEventListener("click", () => row.classList.toggle("lyrics-open"));
  });
  $(".hero .btn-gold")?.addEventListener("click", () => (idx < 0 ? load(startIdx()) : toggle()));
  $(".hero .btn-ghost")?.addEventListener("click", () => share(null));

  /* ── overlay ── */
  $(".now").addEventListener("click", () => idx >= 0 && el.overlay.classList.add("open"));
  $(".overlay-close").addEventListener("click", () => el.overlay.classList.remove("open"));
  $(".ov-share")?.addEventListener("click", () => idx >= 0 && share(tracks[idx]));

  /* ── share ── */
  function share(t) {
    const url = t ? `${BASE}t/${t.slug}/` : BASE;
    const title = t ? `${t.title} — ${A.artist}` : `${A.title} — ${A.artist}`;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => toast("Bağlantı kopyalandı"));
    }
  }
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  /* ── media session (lock screen) ── */
  function setSession(t) {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: A.artist, album: A.title,
      artwork: [{ src: A.artDir + t.id + ".jpeg", sizes: "512x512", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("previoustrack", () => load(idx - 1));
    navigator.mediaSession.setActionHandler("nexttrack", () => load(idx + 1));
    navigator.mediaSession.setActionHandler("seekto", d => { audio.currentTime = d.seekTime; });
  }

  /* ── visualizer ── */
  let ctx, analyser, dataArr, vizOn = false;
  function ensureViz() {
    if (vizOn || !el.viz || !window.AudioContext) return;
    try {
      ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser); analyser.connect(ctx.destination);
      dataArr = new Uint8Array(analyser.frequencyBinCount);
      vizOn = true;
      drawViz();
    } catch { /* CORS or double-init: keep native audio path */ }
  }
  function drawViz() {
    const c = el.viz, g = c.getContext("2d");
    const dpr = devicePixelRatio || 1;
    c.width = 90 * dpr; c.height = 34 * dpr;
    const BARS = 24, W = c.width / BARS;
    (function frame() {
      requestAnimationFrame(frame);
      analyser.getByteFrequencyData(dataArr);
      g.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < BARS; i++) {
        const v = dataArr[Math.floor(i * dataArr.length / BARS / 1.6)] / 255;
        const h = Math.max(2 * dpr, v * c.height);
        g.fillStyle = `rgba(212,162,78,${0.35 + v * 0.65})`;
        g.beginPath();
        g.roundRect(i * W + W * 0.18, c.height - h, W * 0.64, h, 2 * dpr);
        g.fill();
      }
    })();
  }

  /* ── deep link ── */
  function startIdx() {
    const want = document.body.dataset.start;
    const i = tracks.findIndex(t => t.slug === want);
    return i >= 0 ? i : 0;
  }
  if (document.body.dataset.start) {
    load(startIdx(), { autoplay: false });
    play(); // will be blocked politely if no gesture; UI stays ready
  }
})();
