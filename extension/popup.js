const api = globalThis.browser ?? globalThis.chrome;
const $ = id => document.getElementById(id);
const t = key => api.i18n.getMessage(key) || key;

const COMMON = ["MXN", "USD", "EUR", "GBP", "CAD", "JPY", "CNY", "INR", "BRL", "COP", "CLP", "ARS"];
const DOLLAR_CURRENCIES = ["USD", "MXN", "CAD", "AUD", "NZD", "ARS", "CLP", "COP", "SGD", "HKD"];
const SOURCES = {
  "er-api": ["ExchangeRate-API", "https://www.exchangerate-api.com"],
  "frankfurter": ["Frankfurter (ECB)", "https://frankfurter.dev"]
};

const lang = api.i18n.getUILanguage();
let names = null;
try { names = new Intl.DisplayNames([lang], { type: "currency" }); } catch (_) {}
const label = c => {
  try { return names ? `${c} – ${names.of(c)}` : c; } catch (_) { return c; }
};

document.documentElement.lang = lang;
document.querySelectorAll("[data-i18n]").forEach(el => (el.textContent = t(el.dataset.i18n)));
$("dollarLabel").textContent = t("dollarMeans").replace("%s", "$");

function render({ settings, currencies, source, updated, ts }) {
  const common = COMMON.filter(c => currencies.includes(c));
  const others = currencies.filter(c => !COMMON.includes(c));
  const g1 = document.createElement("optgroup");
  const g2 = document.createElement("optgroup");
  g1.label = t("groupCommon");
  g2.label = t("groupAll");
  g1.append(...common.map(c => new Option(label(c), c)));
  g2.append(...others.map(c => new Option(label(c), c)));
  $("target").replaceChildren(g1, g2);
  $("target").value = settings.target;

  $("dollar").replaceChildren(...DOLLAR_CURRENCIES.filter(c => currencies.includes(c)).map(c => new Option(label(c), c)));
  $("dollar").value = settings.dollarDefault;

  const [name, url] = SOURCES[source] || [source, null];
  const link = document.createElement("a");
  link.textContent = name;
  if (url) {
    link.href = url;
    link.addEventListener("click", e => {
      e.preventDefault();
      api.tabs.create({ url });
      window.close();
    });
  }
  const when = new Date(updated || ts).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
  $("meta").replaceChildren(`${t("ratesBy")} `, link, document.createElement("br"), `${t("updated")} ${when}`);
}

async function load(force = false) {
  let state = null;
  try {
    state = await api.runtime.sendMessage({ type: "getState", force });
  } catch (e) {
    state = { ok: false, error: String(e) };
  }
  if (state && state.ok) render(state);
  else $("meta").textContent = `${t("ratesError")} ${(state && state.error) || ""}`;
}

async function save() {
  await api.runtime.sendMessage({
    type: "saveSettings",
    settings: { target: $("target").value, dollarDefault: $("dollar").value }
  });
  $("ok").textContent = t("saved");
  setTimeout(() => ($("ok").textContent = ""), 1200);
}

$("target").addEventListener("change", save);
$("dollar").addEventListener("change", save);
$("refresh").addEventListener("click", () => load(true));
load();
