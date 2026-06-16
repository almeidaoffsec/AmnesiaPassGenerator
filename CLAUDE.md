# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A deterministic password generator: given a keyword (+ optional per-service salt), it repeatedly hashes the value and cuts the result to a desired length, producing reproducible passwords without storing anything. There are **two independent implementations of the same algorithm** that must stay in sync:

- `amnesiapassgen.sh` — Bash CLI using coreutils (`md5sum`/`sha256sum`/`sha512sum`).
- `docs/` — a static web app (vanilla JS + CryptoJS) deployable to GitHub Pages, installable as an offline-capable PWA.

There is no build system, package manager, or test suite in this repo — both implementations are plain scripts run directly.

## Commands

Run the CLI directly:
```bash
./amnesiapassgen.sh -p <palavra_chave> -a <algoritmo> [-c <num_caracteres>] [-i <num_iteracoes>] [-s <salt_servico>] [-x <prefixo>] [-y <sufixo>]
```
- `-a` accepts `md5` (discouraged), `sha256`, `sha512`.
- `-i` (iterations) defaults to `1` if omitted.
- `-c` omitted means the full hash is returned (no truncation).

To work on the web version, serve `docs/` over HTTP (the service worker requires a real origin, `file://` won't behave correctly) and open it in a browser, e.g. `python3 -m http.server -d docs`.

No linter, formatter, or test runner is configured for either implementation — verify changes by running the script / exercising the page manually.

## Architecture

### Core algorithm (must match in both implementations)
1. Start with `KEYWORD`; if a salt/service is given, concatenate as `"<keyword>:<salt>"`.
2. Hash with the selected algorithm, then re-hash the hex digest of the previous round, `ITERATIONS` times.
3. If a character count is given, truncate the final hex digest to that length; otherwise return the full digest.
4. Wrap the result with optional prefix/suffix strings.

This logic is implemented twice — `amnesiapassgen.sh` (lines ~83-101, shelling out to `*sum` coreutils) and `generatePassword()` in `docs/script.js` (using `CryptoJS.MD5/SHA256/SHA512`). **Any change to the hashing/iteration/truncation logic must be made in both places** so CLI and web output stay identical for the same inputs — there's no shared library between them.

### `docs/` (PWA / GitHub Pages site)
- `index.html` — two-panel layout: left panel is the generator form (keyword, salt/service, char count, iterations, prefix/suffix, algorithm select), right panel is static help/explanation text. All sensitive inputs (`<input type="password">`) have a show/hide toggle button.
- `script.js` — wires up the form, runs the algorithm via CryptoJS, handles clipboard copy (`navigator.clipboard` with a `document.execCommand('copy')` fallback for non-secure contexts), and registers the service worker.
- `crypto-js.min.js` — vendored locally (not loaded from a CDN) so the app keeps working offline.
- `sw.js` — service worker with a versioned cache (`CACHE_NAME`, currently `apg-static-v3`) listing `STATIC_ASSETS`. **Bump `CACHE_NAME` whenever `STATIC_ASSETS` changes** (e.g. new/renamed static files) so clients pick up the new cache instead of serving stale files; old caches are deleted on `activate`. HTML navigations use network-first with cache fallback; other assets use cache-first with a background revalidation fetch.
- `manifest.json` — PWA metadata (icons, theme colors, standalone display) consumed by `index.html`'s `<link rel="manifest">`.
- Everything runs client-side only; no data is ever sent to a server (this is called out explicitly in the UI copy and should remain true for any new feature).

### `branding/` (untracked, not yet wired into `docs/`)
Contains the `almeidaoffsec` personal brand frontend guide (`almeidaoffsec_frontend_guide.md`), a reusable header/footer component (`almeidaoffsec_header_footer.html`), and brand SVG assets under `branding/assets/brand/`. This defines the color palette (CSS variables like `--color-void`, `--color-terminal`, `--color-scan-blue`), typography stack (Space Grotesk / Inter / JetBrains Mono), and component patterns (cards, badges, buttons, terminal blocks) for the `almeidaoffsec` brand. `docs/style.css` does **not** currently follow this guide — if asked to restyle or rebrand the web app, use this guide as the source of truth rather than improvising new colors/fonts.
