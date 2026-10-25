# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-25

First public release.

### Added

- Conversion bubble when you select a price on any page; click it to copy the converted amount.
- Recognizes currency symbols, ISO codes and currency names in English and Spanish, Western, European and Indian number grouping, and suffixes like `k`, `mil` and `M`.
- When a selection has several numbers, converts the one next to a currency marker.
- Toolbar popup to choose the target currency and what a plain `$` means.
- Exchange rates from ExchangeRate-API with Frankfurter (ECB) as fallback, cached for 6 hours and reused offline.
- English and Spanish interface.
- macOS wrapper app, `make install`, parser tests and CI.

[1.0.0]: https://github.com/ceolitzin/CurrencyConverter4Safari/releases/tag/v1.0.0
