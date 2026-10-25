const api = globalThis.browser ?? globalThis.chrome;

const TTL_MS = 6 * 60 * 60 * 1000; // re-check every 6 h (both providers publish daily)

// Default target currency from the browser's region; changeable in the popup
const EURO_REGIONS = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");
const REGION_CURRENCY = {
  US: "USD", MX: "MXN", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD", JP: "JPY", CN: "CNY", IN: "INR",
  BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN", UY: "UYU", CH: "CHF", SE: "SEK", NO: "NOK",
  DK: "DKK", PL: "PLN", CZ: "CZK", KR: "KRW", TR: "TRY", ZA: "ZAR", SG: "SGD", HK: "HKD", IL: "ILS"
};

function defaultTarget() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (EURO_REGIONS.includes(region)) return "EUR";
    return REGION_CURRENCY[region] || "USD";
  } catch (_) {
    return "USD";
  }
}

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} – ${url}`);
  return r.json();
}

async function fetchRates() {
  // 1) ExchangeRate-API open access: free, no key, ~160 currencies
  try {
    const j = await getJSON("https://open.er-api.com/v6/latest/USD");
    if (j.result === "success" && j.rates) {
      return { rates: j.rates, source: "er-api", updated: j.time_last_update_unix * 1000, ts: Date.now() };
    }
  } catch (_) {}
  // 2) Fallback: Frankfurter (European Central Bank reference rates, ~30 currencies)
  const j = await getJSON("https://api.frankfurter.dev/v1/latest?base=USD");
  if (!j.rates) throw new Error("Frankfurter: no rates in response");
  return { rates: { USD: 1, ...j.rates }, source: "frankfurter", updated: Date.parse(j.date), ts: Date.now() };
}

let inflight = null;

async function getRates(force = false) {
  const { cache } = await api.storage.local.get("cache");
  if (!force && cache && Date.now() - cache.ts < TTL_MS) return cache;
  inflight ??= fetchRates().finally(() => { inflight = null; });
  try {
    const fresh = await inflight;
    await api.storage.local.set({ cache: fresh });
    return fresh;
  } catch (e) {
    if (cache) return cache; // offline: keep using the last rates we had
    throw e;
  }
}

async function getSettings() {
  const { settings } = await api.storage.local.get("settings");
  return { target: defaultTarget(), dollarDefault: "USD", ...(settings || {}) };
}

async function handle(msg) {
  if (msg.type === "convert") {
    if (!Number.isFinite(msg.amount)) return { ok: false, error: "Invalid amount" };
    const settings = await getSettings();
    const { rates, ts } = await getRates();
    const from = msg.from === "$" ? settings.dollarDefault : msg.from;
    const to = settings.target;
    if (!rates[from] || !rates[to]) return { ok: false, error: `Unsupported currency: ${from}` };
    if (from === to) return { ok: false, same: true };
    const rate = rates[to] / rates[from];
    return { ok: true, from, to, rate, value: msg.amount * rate, ts };
  }
  if (msg.type === "getState") {
    const settings = await getSettings();
    const cache = await getRates(msg.force === true);
    const currencies = Object.keys(cache.rates).sort();
    return { ok: true, settings, currencies, source: cache.source, updated: cache.updated, ts: cache.ts };
  }
  if (msg.type === "saveSettings") {
    const current = await getSettings();
    await api.storage.local.set({ settings: { ...current, ...msg.settings } });
    return { ok: true };
  }
  return { ok: false, error: `Unknown message: ${msg.type}` };
}

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handle(msg).then(sendResponse, e => sendResponse({ ok: false, error: String(e) }));
  return true; // async response
});
