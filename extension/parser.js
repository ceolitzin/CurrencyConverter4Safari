// Detects a price (amount + currency) in a short piece of selected text.
// Loaded before content.js in the page, and required directly by the Node tests.
(() => {
  const MAX_LENGTH = 80;

  // Matched case-insensitively. Sorted longest first so "US$" wins over "$".
  const SYMBOLS = [
    ["USD$", "USD"], ["MXN$", "MXN"], ["US$", "USD"], ["MX$", "MXN"], ["CA$", "CAD"], ["AU$", "AUD"],
    ["NZ$", "NZD"], ["HK$", "HKD"], ["NT$", "TWD"], ["RMB", "CNY"], ["C$", "CAD"], ["A$", "AUD"],
    ["S$", "SGD"], ["R$", "BRL"], ["zł", "PLN"], ["Kč", "CZK"], ["€", "EUR"], ["£", "GBP"], ["¥", "JPY"],
    ["円", "JPY"], ["元", "CNY"], ["₹", "INR"], ["₩", "KRW"], ["₽", "RUB"], ["₺", "TRY"], ["₱", "PHP"],
    ["₪", "ILS"], ["₫", "VND"], ["฿", "THB"], ["₴", "UAH"], ["₦", "NGN"],
    ["$", "$"] // ambiguous: resolved by the "$ means" setting
  ].sort((a, b) => b[0].length - a[0].length);

  // Currency names, usually written after the amount ("100 dólares"). More specific first.
  const WORDS = [
    ["d[oó]lares canadienses|canadian dollars?", "CAD"],
    ["d[oó]lares australianos|australian dollars?", "AUD"],
    ["d[oó]lar(?:es)?(?: estadounidenses| americanos)?|dollars?|bucks", "USD"],
    ["euros?", "EUR"],
    ["pesos? colombianos?", "COP"],
    ["pesos? argentinos?", "ARS"],
    ["pesos? chilenos?", "CLP"],
    ["pesos?(?: mexicanos?)?", "MXN"],
    ["libras?(?: esterlinas?)?|pounds?(?: sterling)?", "GBP"],
    ["yen(?:es)?", "JPY"],
    ["yuan(?:es)?|renminbi", "CNY"],
    ["rupias?|rupees?", "INR"],
    ["reales|reais", "BRL"],
    ["francos? suizos?|swiss francs?", "CHF"]
  ].map(([src, cur]) => [src.replace(/ /g, "\\s+"), cur]);
  const WORD_AT_START = WORDS.map(([src, cur]) => [new RegExp(`^(?:${src})(?!\\p{L})`, "iu"), cur]);
  const WORD_ANYWHERE = WORDS.map(([src, cur]) => [new RegExp(`(?:^|[^\\p{L}])(?:${src})(?!\\p{L})`, "iu"), cur]);

  // Suffixes such as "12.5k" or "3 millones". Order matters: "mil millones" before "mil".
  const MULTIPLIERS = [
    [/^\s*(?:mil\s+millones|bn|billions?)(?!\p{L})/iu, 1e9],
    [/^\s*(?:m|mm|mn|mill[oó]n|millones|millions?)(?!\p{L})/iu, 1e6],
    [/^\s*(?:k|mil|thousand)(?!\p{L})/iu, 1e3]
  ];

  // Amounts with grouping ("1,234.56", "1.234,56", "1 234", Indian "12,34,567") or plain ("119", "12,5").
  const NUMBER = /\d{1,3}(?:[.,'’   ]\d{2,3})*[.,'’   ]\d{3}(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;

  // ISO codes are only trusted in uppercase ("ALL", "TOP" and "CUP" are currencies, but also words).
  // These are common enough to also accept in lowercase right next to the amount ("100 usd").
  const LOWERCASE_OK = new Set(["USD", "EUR", "MXN", "GBP", "CAD", "AUD", "JPY", "CNY", "INR", "BRL", "COP", "CLP", "ARS", "CHF"]);
  let isoCodes = null;
  try { isoCodes = new Set(Intl.supportedValuesOf("currency")); } catch (_) {}
  const isCode = c => (isoCodes ? isoCodes.has(c) : /^[A-Z]{3}$/.test(c));

  function parseNumber(raw) {
    let s = raw.replace(/[\s  '’]/g, "");
    const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
    if (lastDot !== -1 && lastComma !== -1) {
      // Both present: whichever comes last is the decimal separator
      const dec = lastDot > lastComma ? "." : ",";
      const thou = dec === "." ? "," : ".";
      s = s.split(thou).join("").replace(dec, ".");
    } else if (lastDot !== -1 || lastComma !== -1) {
      const parts = s.split(lastDot !== -1 ? "." : ",");
      // Repeated, or exactly 3 digits after it => thousands separator ("1,234"), unless it starts with 0 ("0,500")
      const thousands = parts.length > 2 || (parts[parts.length - 1].length === 3 && !/^0+$/.test(parts[0]));
      s = thousands ? parts.join("") : parts.join(".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function codeFrom(match, strict) {
    if (!match) return null;
    const code = match.toUpperCase();
    if (!isCode(code)) return null;
    return match === code || (!strict && LOWERCASE_OK.has(code)) ? code : null;
  }

  // Currency written right before the amount: "$119", "US$ 5", "EUR 10", "MX$ 1,000"
  function currencyBefore(before) {
    const s = before.replace(/[\s:=]+$/, "");
    const up = s.toUpperCase();
    for (const [sym, cur] of SYMBOLS) if (up.endsWith(sym.toUpperCase())) return cur;
    const m = s.match(/(?:^|[^A-Za-z])([A-Za-z]{3})$/);
    return codeFrom(m && m[1], false);
  }

  // Currency written right after the amount: "12,50 €", "100 USD", "300 pesos", "1.5 millones de dólares"
  function currencyAfter(after) {
    const s = after.replace(/^\s*(?:de\s+|of\s+)?/i, "");
    const up = s.toUpperCase();
    for (const [sym, cur] of SYMBOLS) if (up.startsWith(sym.toUpperCase())) return cur;
    const m = s.match(/^([A-Za-z]{3})(?![A-Za-z])/);
    const code = codeFrom(m && m[1], false);
    if (code) return code;
    for (const [re, cur] of WORD_AT_START) if (re.test(s)) return cur;
    return null;
  }

  // Last resort when the selection has a single number: "Precio (USD) 100"
  function currencyAnywhere(text) {
    for (const m of text.matchAll(/(?:^|[^A-Za-z])([A-Z]{3})(?![A-Za-z])/g)) {
      const code = codeFrom(m[1], true);
      if (code) return code;
    }
    const up = text.toUpperCase();
    for (const [sym, cur] of SYMBOLS) if (up.includes(sym.toUpperCase())) return cur;
    for (const [re, cur] of WORD_ANYWHERE) if (re.test(text)) return cur;
    return null;
  }

  // Returns { amount, from } or null. `from` is an ISO code, or "$" when the dollar sign is ambiguous.
  function parseSelection(input) {
    const text = typeof input === "string" ? input.trim() : "";
    if (!text || text.length > MAX_LENGTH) return null;

    const found = [];
    for (const m of text.matchAll(NUMBER)) {
      const amount = parseNumber(m[0]);
      if (amount === null) continue;
      const end = m.index + m[0].length;
      let after = text.slice(end);
      let multiplier = 1;
      for (const [re, value] of MULTIPLIERS) {
        const mm = after.match(re);
        if (mm) { multiplier = value; after = after.slice(mm[0].length); break; }
      }
      const from = currencyBefore(text.slice(0, m.index)) || currencyAfter(after);
      if (from) return { amount: amount * multiplier, from };
      found.push({ amount: amount * multiplier, start: m.index, end });
    }

    if (found.length !== 1) return null;
    const { amount, start, end } = found[0];
    const from = currencyAnywhere(text.slice(0, start) + " " + text.slice(end));
    return from ? { amount, from } : null;
  }

  const CurrencyParser = { parseSelection, parseNumber };
  if (typeof module === "object" && module.exports) module.exports = CurrencyParser;
  else globalThis.CurrencyParser = CurrencyParser;
})();
