/* EserV2 player */
(() => {
  const A = window.ALBUM;
  const BASE = A.base; // absolute site base with trailing slash
  const tracks = A.songs;
  // resolve asset dirs to absolute URLs NOW, before history.replaceState
  // changes the path and breaks relative resolution
  const AUDIO_DIR = new URL(A.audioDir, document.baseURI).href;
  const ART_DIR = new URL(A.artDir, document.baseURI).href;

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
    audio.src = AUDIO_DIR + t.id + ".mp3";
    el.nowArt.src = ART_DIR + t.id + ".jpeg";
    el.nowTitle.textContent = t.title;
    el.nowSub.textContent = A.artist;
    el.ovArt.src = ART_DIR + t.id + ".jpeg";
    el.ovBg.style.backgroundImage = `url("${ART_DIR + t.id}.jpeg")`;
    el.ovTitle.textContent = t.title;
    el.ovLyrics.textContent = t.lyrics || "";
    el.dur.textContent = fmt(t.duration);
    el.player.classList.add("visible");
    document.title = `${t.title} — ${A.title}`;
    $$(".track").forEach(r => {
      const on = r.dataset.id === t.id;
      r.classList.toggle("active", on);
    });
    $$(".cover").forEach(c => c.classList.toggle("active", c.dataset.id === t.id));
    try { history.replaceState(null, "", BASE + "t/" + t.slug + "/"); } catch { /* local preview */ }
    setSession(t);
    if (autoplay) play();
  }

  function play() {
    ensureViz();
    if (ctx && ctx.state === "suspended") ctx.resume();
    audio.play().then(() => {
      playing = true; syncUI();
    }).catch(() => { playing = false; syncUI(); });
  }
  function pause() { audio.pause(); playing = false; syncUI(); }
  const toggle = () => (playing ? pause() : (idx < 0 ? load(startIdx()) : play()));

  function syncUI() {
    el.playIco.style.display = playing ? "none" : "";
    el.pauseIco.style.display = playing ? "" : "none";
    el.player.classList.toggle("await", idx >= 0 && !playing);
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
      artwork: [{ src: ART_DIR + t.id + ".jpeg", sizes: "512x512", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("previoustrack", () => load(idx - 1));
    navigator.mediaSession.setActionHandler("nexttrack", () => load(idx + 1));
    navigator.mediaSession.setActionHandler("seekto", d => { audio.currentTime = d.seekTime; });
  }

  /* ── visualizer ──
     Audio is only routed through Web Audio once the context is verifiably
     RUNNING; otherwise the element keeps its default (always audible) path.
     Routing through a suspended context would mute playback on some browsers
     (iOS Safari) — never risk sound for a spectrum display. */
  let ctx, analyser, dataArr, connected = false, vizOn = false;
  function ensureViz() {
    if (!el.viz || !window.AudioContext) return;
    if (!ctx) {
      try { ctx = new AudioContext(); } catch { return; }
      ctx.onstatechange = tryConnect;
    }
    if (ctx.state === "suspended") ctx.resume().then(tryConnect).catch(() => {});
    else tryConnect();
  }
  function tryConnect() {
    if (connected || !ctx || ctx.state !== "running") return;
    try {
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser); analyser.connect(ctx.destination);
      dataArr = new Uint8Array(analyser.frequencyBinCount);
      connected = true;
      if (!vizOn) { vizOn = true; drawViz(); }
    } catch { /* double-init etc.: keep native audio path */ }
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

  /* ── cover wall ── */
  $$(".cover").forEach(c => c.addEventListener("click", () => {
    const i = +c.dataset.index;
    if (i === idx) toggle(); else load(i);
  }));

  /* ── topbar state ── */
  const topbar = $(".topbar");
  const onScroll = () => topbar?.classList.toggle("scrolled", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── scroll reveal ── */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
          setTimeout(() => { en.target.style.transitionDelay = ""; }, 1300);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(n => io.observe(n));
    $$(".track, .cover").forEach((n, i) => {
      n.classList.add("reveal");
      n.style.transitionDelay = `${Math.min((i % 10) * 55, 400)}ms`;
      io.observe(n);
    });
  } else {
    $$(".reveal").forEach(n => n.classList.add("in"));
  }
  // safety net: never leave content hidden if the observer misbehaves
  setTimeout(() => $$(".reveal:not(.in)").forEach(n => {
    n.style.transitionDelay = "";
    n.classList.add("in");
  }), 3000);

  /* ── hero deck parallax ── */
  const stack = $(".hero-stack");
  if (stack && matchMedia("(pointer: fine)").matches) {
    const hero = $(".hero");
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - .5;
      const ny = (e.clientY - r.top) / r.height - .5;
      stack.style.setProperty("--tx", (nx * 18).toFixed(1) + "px");
      stack.style.setProperty("--ty", (ny * 14).toFixed(1) + "px");
    });
    hero.addEventListener("pointerleave", () => {
      stack.style.setProperty("--tx", "0px");
      stack.style.setProperty("--ty", "0px");
    });
  }

  /* ── deep link ── */
  function startIdx() {
    const want = document.body.dataset.start;
    const i = tracks.findIndex(t => t.slug === want);
    return i >= 0 ? i : 0;
  }
  if (document.body.dataset.start) {
    load(startIdx(), { autoplay: false });
    play(); // usually blocked without a gesture; UI stays ready
    // shared-link UX: the first tap anywhere starts the shared song,
    // unless the tap targets a control that has its own behavior
    const kick = e => {
      const own = e.target.closest(".track, .cover, button, a, input, .player, .overlay");
      if (!playing && !own) play();
      document.removeEventListener("pointerdown", kick, true);
    };
    document.addEventListener("pointerdown", kick, true);
  }
})();
