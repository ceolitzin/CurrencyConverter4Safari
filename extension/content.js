(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const { parseSelection } = globalThis.CurrencyParser;
  const t = key => api.i18n.getMessage(key) || key;

  // ---------- Bubble (closed Shadow DOM so the page's CSS can't touch it) ----------
  let host = null, bubble = null, valueEl = null, hintEl = null;

  function ensureBubble() {
    if (host) {
      if (!host.isConnected) document.documentElement.appendChild(host);
      return;
    }
    host = document.createElement("div");
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;top:0;left:0;display:none;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .b{font:13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#2b2b2b;color:#fff;
           border-radius:8px;padding:7px 11px;box-shadow:0 4px 14px rgba(0,0,0,.3);
           cursor:pointer;white-space:nowrap;-webkit-user-select:none;user-select:none;position:relative}
        .v{font-size:15px;font-weight:600}
        .r{font-size:11px;opacity:.7;margin-top:2px}
        .b:after{content:"";position:absolute;left:var(--ax,50%);top:100%;margin-left:-6px;
           border:6px solid transparent;border-bottom:0;border-top-color:#2b2b2b}
        .b.below:after{top:auto;bottom:100%;border:6px solid transparent;border-top:0;border-bottom-color:#2b2b2b}
      </style>
      <div class="b"><div class="v"></div><div class="r"></div></div>`;
    bubble = root.querySelector(".b");
    valueEl = root.querySelector(".v");
    hintEl = root.querySelector(".r");
    // Keep the page selection intact while clicking the bubble
    bubble.addEventListener("mousedown", e => e.preventDefault());
    bubble.addEventListener("click", copy);
    document.documentElement.appendChild(host);
  }

  async function copy() {
    bubble.style.minWidth = `${bubble.offsetWidth}px`; // keep the arrow in place when the hint gets shorter
    try {
      await navigator.clipboard.writeText(bubble.dataset.copy);
      hintEl.textContent = t("copied");
    } catch (_) {
      hintEl.textContent = t("copyFailed");
    }
  }

  let seq = 0; // bumps on every hide/selection so late responses are dropped

  function hide() {
    seq++;
    if (host) host.style.display = "none";
  }

  function formatMoney(value, cur) {
    let s;
    try {
      s = new Intl.NumberFormat(undefined, { style: "currency", currency: cur, currencyDisplay: "narrowSymbol" }).format(value);
    } catch (_) {
      s = value.toFixed(2);
    }
    // "$2,345.68 MXN", but not "KWD 1.234 KWD" for currencies without a symbol
    return s.includes(cur) ? s : `${s} ${cur}`;
  }

  function show(res, rect) {
    ensureBubble();
    const rate = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 }).format(res.rate);
    valueEl.textContent = formatMoney(res.value, res.to);
    hintEl.textContent = `1 ${res.from} = ${rate} ${res.to} · ${t("clickToCopy")}`;
    bubble.dataset.copy = res.value.toFixed(2);
    bubble.style.minWidth = "";

    host.style.display = "block";
    host.style.visibility = "hidden";
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const center = rect.left + rect.width / 2;
    const left = Math.max(6, Math.min(center - w / 2, vw - w - 6));
    const below = rect.top - h - 10 < 0; // no room above: show it under the selection
    const top = below ? rect.bottom + 10 : rect.top - h - 10;
    bubble.classList.toggle("below", below);
    bubble.style.setProperty("--ax", `${Math.max(12, Math.min(center - left, w - 12))}px`);
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
    host.style.visibility = "visible";
  }

  async function update() {
    const sel = window.getSelection();
    const parsed = sel && sel.rangeCount ? parseSelection(sel.toString()) : null;
    if (!parsed) return hide();
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return hide();

    const id = ++seq;
    let res = null;
    try {
      res = await api.runtime.sendMessage({ type: "convert", amount: parsed.amount, from: parsed.from });
    } catch (_) {}
    if (id !== seq) return;
    if (res && res.ok) show(res, rect); else hide();
  }

  let timer = null;
  function onSelect() {
    clearTimeout(timer);
    timer = setTimeout(update, 120);
  }

  // Capture phase, so pages that stop propagation don't break the extension.
  // Events from inside the closed shadow root are retargeted to `host`.
  const outside = e => e.target !== host;
  document.addEventListener("mouseup", e => { if (outside(e)) onSelect(); }, true);
  document.addEventListener("mousedown", e => { if (outside(e)) hide(); }, true);
  document.addEventListener("keyup", e => { if (e.shiftKey || e.key === "Shift") onSelect(); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); }, true);
  window.addEventListener("scroll", hide, { capture: true, passive: true });
  window.addEventListener("resize", hide, { passive: true });
})();
