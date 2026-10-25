const test = require("node:test");
const assert = require("node:assert/strict");
const { parseSelection, parseNumber } = require("../extension/parser.js");

test("parseNumber handles common grouping and decimal styles", () => {
  const cases = [
    ["119", 119],
    ["1,234.56", 1234.56],
    ["1.234,56", 1234.56],
    ["12,50", 12.5],
    ["1,234", 1234],
    ["1.234.567,89", 1234567.89],
    ["1 234,56", 1234.56],
    ["1 234", 1234],
    ["12,34,567.89", 1234567.89],
    ["0,500", 0.5],
    ["1'234.50", 1234.5]
  ];
  for (const [raw, expected] of cases) assert.equal(parseNumber(raw), expected, raw);
});

test("parseSelection recognizes prices", () => {
  const cases = [
    ["$119", 119, "$"],
    ["Windows 10 Home - $119", 119, "$"],
    ["Windows 10 Pro Pack (to upgrade from Home edition to Pro) - $99", 99, "$"],
    ["₹8,024.13", 8024.13, "INR"],
    ["₹1,23,456.78", 123456.78, "INR"],
    ["1.234,56 €", 1234.56, "EUR"],
    ["€ 12,50", 12.5, "EUR"],
    ["US$ 1,000", 1000, "USD"],
    ["MX$250", 250, "MXN"],
    ["MXN$ 1,500.00", 1500, "MXN"],
    ["CA$19.99", 19.99, "CAD"],
    ["R$ 49,90", 49.9, "BRL"],
    ["£9.99", 9.99, "GBP"],
    ["¥1,000", 1000, "JPY"],
    ["1 000 zł", 1000, "PLN"],
    ["100 Kč", 100, "CZK"],
    ["USD 100", 100, "USD"],
    ["100 USD", 100, "USD"],
    ["100 usd", 100, "USD"],
    ["EUR: 20", 20, "EUR"],
    ["0.500 EUR", 0.5, "EUR"],
    ["12.5k USD", 12500, "USD"],
    ["$5 mil", 5000, "$"],
    ["€5M", 5e6, "EUR"],
    ["1.5 millones de dólares", 1.5e6, "USD"],
    ["300 pesos", 300, "MXN"],
    ["50 dólares canadienses", 50, "CAD"],
    ["100 dollars", 100, "USD"],
    ["20 euros", 20, "EUR"],
    ["for the $20", 20, "$"],
    ["ALL ITEMS $50", 50, "$"],
    ["($1,234.00)", 1234, "$"],
    ["2 x $100", 100, "$"],
    ["Precio (USD) 100", 100, "USD"],
    ["$119 (₹8,024.13)", 119, "$"]
  ];
  for (const [text, amount, from] of cases) {
    assert.deepEqual(parseSelection(text), { amount, from }, text);
  }
});

test("parseSelection ignores text that is not a price", () => {
  const cases = [
    "",
    "Windows 10",
    "12345",
    "100 m",
    "100 eurostar",
    "call all 5 of them",
    "The price is right " + "x".repeat(80) + " $5",
    "10 and 20"
  ];
  for (const text of cases) assert.equal(parseSelection(text), null, text);
  assert.equal(parseSelection(undefined), null);
});
