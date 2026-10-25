# Contributing

Thanks for helping. Issues and pull requests in English or Spanish are both welcome.

## Reporting a price that isn't recognized

Open an issue with the "Price not recognized" template and paste the exact text you selected, the page if it's public, and what you expected. Those examples become test cases.

## Setting up

You need macOS, Xcode and Node 18 or later. There are no npm dependencies.

```bash
npm test
make install TEAM=XXXXXXXXXX   # see README for finding your team ID
```

After changing the extension, run `make install` again and reload the page in Safari.

## Pull requests

- Keep the extension dependency-free; it ships as plain files.
- Add or update a case in `tests/parser.test.js` for any change to how prices are recognized, and make sure `npm test` passes.
- Put every user-facing string in both `extension/_locales/en/messages.json` and `extension/_locales/es/messages.json`. New languages are welcome as a new folder under `_locales`.
- If you add a file to `extension/`, also add it to the extension target's resources in `xcode/Currency Converter.xcodeproj`, or it won't be included in the app.
- Don't commit your `DEVELOPMENT_TEAM`; pass it to `make` instead.
- Describe what you tested in Safari.

## Privacy

The extension must not send anything from the pages people visit to any server. Changes that add network requests or permissions need a clear reason and an update to [PRIVACY.md](PRIVACY.md).
