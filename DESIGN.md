# HamsterTip design

## Overview

HamsterTip is a small Sepolia tipping app for the Squeekchain hamster economy. Its visual idea is a warm paper-like interface with a hamster holding an Ethereum coin: the character makes the product approachable, while exact amounts, clear labels, and a review step keep transactions understandable.

The main task has priority over explanation. On desktop, a compact illustrated introduction sits beside the tip form. On mobile the illustration is omitted and the complete form appears on the first screen. The lower community area uses spacing and dividers rather than a collection of nested cards. All source styling is in [src/styles.css](src/styles.css); the page composition is in [src/App.tsx](src/App.tsx).

## Colors

Hex primitives and semantic aliases form one palette shared with the SVG artwork. There is one light theme, with no automatic dark variant.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--bg` | `#f7f5ee` | Page background |
| `--surface` | `#fffefa` | Form, dialog, selected filter |
| `--surface-subtle` | `#eeeade` | Quiet icon backgrounds, filter track |
| `--border` | `#ded8ca` | Structural dividers and panel outlines |
| `--border-control` | `#958b79` | Amount and message field boundaries |
| `--text` | `#302c23` | Primary text and filled-action labels |
| `--muted` | `#6b6255` | Supporting text, hints, timestamps |
| `--accent` | `#f0bc60` | Primary action fill |
| `--accent-hover` | `#e8ac45` | Primary hover/pressed fill |
| `--accent-subtle` | `#fff1d3` | Selected amount and first-rank background |
| `--accent-text` | `#83521c` | Selected amounts, accent links, headline color |
| `--success` / `--success-bg` | `#456039` / `#e9eee3` | Confirmed status, activity values, quiet green surfaces |
| `--error` | `#a13625` | Recoverable form, network, and transaction errors |
| `--focus` / `--icon` | `#514637` | Focus outlines / neutral icons |

Status always includes text or an icon; the small network dot is supplemental. The filled amber button marks the current primary action. The headline’s brown accent is also part of the brand; ordinary links carry an underline or control affordance.

Rendered solid-pair measurements include primary text on page **12.75:1**, supporting text on page **5.49:1**, supporting text on the filter track **4.98:1**, selected-amount text **5.89:1**, primary-button text **7.99:1**, error text on surface **6.78:1**, and the focus color against the form surface **9.12:1**. The final form border is **3.33:1** against its surface. See validation for measurement scope; these are identified pairs, not a blanket accessibility certification.

## Typography

The site bundles the Latin variable WOFF2 from `@fontsource-variable/dm-sans`. `@font-face` declares `DM Sans Variable`, normal style, weights 100–1000, and `font-display: swap`. The interface uses only **400, 600, and 700**. Fallbacks are `DM Sans`, then `sans-serif`; user messages may use platform glyph fallbacks. There is no italic or monospace interface style. Font loading was confirmed in the rendered export.

| Token | Size at 16 px root | Role |
| --- | --- | --- |
| `--text-sm` | 14 px | Labels, hints, data rows, footer |
| `--text-base` | 16 px | Body, textarea, wallet rows |
| `--text-lg` | 20 px | Community section headings, compact form heading |
| `--text-xl` | 24 px | Panel headings, amount input, compact stats |
| `--text-2xl` | 36 px | Stats, review amount, compact main headline |
| `--text-display` | 56 px | Expanded main headline |

Body line height is 1.5; the introduction uses 1.6. The expanded headline is 1.06 with −0.055em tracking; its compact version is 1.12 with −0.04em. Section headings use 1.25–1.3 and mild negative tracking. Headings balance their lines; body paragraphs use pretty wrapping. Input text is at least 16 px to avoid mobile input zoom. Numeric amounts and counters use tabular figures.

ETH amounts preserve their exact precision and can wrap. Public messages preserve newlines and wrap unbroken text. Addresses are shortened in dense lists with full checksummed addresses in accessible text, link titles, and explorer destinations. The account and transaction-review dialogs display complete addresses with `overflow-wrap: anywhere`.

## Layout and spacing

`.page-wrap`, `.header-inner`, and `.footer-inner` share a 1160 px maximum width. Expanded gutters are 32 px per side, reduced to 20 px at 768 px and 16 px at 432 px. Base spacing steps are 4, 8, 12, 16, 24, 32, 48, and 64 px (`--space-1` through `--space-8`); compact control gaps also use 6 px and form padding uses 20/24/28 px where needed.

The desktop task grid is `1.1fr 1fr` with an 80 px gap. The community grid is `1fr 1.2fr` with a 48 px gap and one vertical divider. Stats form three equal columns. There are no fixed-height content panels or sticky actions. The primary button is in normal document flow.

| Breakpoint | Implemented behavior |
| --- | --- |
| Above 66 rem / 1056 px | Expanded headline, 80 px task gap, full stat icons |
| At or below 66 rem | 36 px headline, 32 px task gap, smaller community gap, no stat icons |
| At or below 48 rem / 768 px | Single task column; illustration and desktop nav omitted; community sections stack; stats remain three columns; footer stacks; lower explainer becomes a two-column grid with its action on a separate row |
| At or below 40 rem / 640 px | Dialogs become full-width bottom sheets with safe-area padding and bounded scrolling |
| At or below 27 rem / 432 px | 20 px brand/form heading, 20 px panel padding, compact presets, 80 px message area, 48 px submit button |

No content is hidden to mask horizontal overflow. The artwork is intentionally omitted on mobile so the tool stays above the fold. At 390 × 844, the submit action spans approximately y=666–714. Reflow was checked at 320, 390, 768, 1060, and 1440 px, plus 200% text enlargement at 768 px. Native browser zoom and physical devices remain unverified.

## Elevation and shape

The page is deliberately flat. Panels use a border without a shadow. Only the modal uses elevation: `0 24px 80px #302c2333`, with a `#302c2366` backdrop and no panel border. Native `<dialog>` provides the top layer.

`--radius-control` is 12 px and `--radius-panel` is 24 px. Amount presets use 8 px radii; selected filter buttons use 6 px inside an 8 px track. At narrow widths the tip panel radius becomes 20 px. Avatar and status-icon backgrounds are circles. The original hamster drawing and favicon use rounded outlines that match the UI without serving as additional controls.

## Components and states

| Component / source | Purpose and states |
| --- | --- |
| `.button`, `.primary`, `.secondary`, `.text-button`, `.icon-button` in `styles.css` | Main, neutral, text, and icon actions. Explicit hover, active, disabled, and focus states; primary action is 48–52 px high. No `transition: all`. |
| `TipForm` in `src/components/TipForm.tsx` | Editable amount, three presets plus Custom, optional message, exact UTF-8 count. Submit-time errors focus the first invalid field. Review modal precedes signing. Disabled during submission or wrong network; success, rejection, revert, pending, and unconfirmed states are explicit. |
| `WalletControl`, `ConnectSheet`, `AccountSheet` in `src/wallet/ConnectSheet.tsx` | Header connection/address/network control, wallet selection, and account details. Named EIP-6963 rows, mobile deep links, Coinbase row, row-level pending text, inline error/retry, and disconnect. Wallet rows are at least 56 px high. |
| `Modal` in `src/components/Modal.tsx` | Native dialog shared by wallet, review, account, and help. Has an accessible name, close button, Escape and backdrop dismissal, modal background behavior, scroll containment, and focus return to the trigger. |
| `Community` in `src/components/Community.tsx` | On-chain stats, top-10 ordered leaderboard, activity, All/My filters, and Show more. Loading/empty/stale/error states are distinct. Refresh stays beside the data it controls. Stats use valid term/definition pairs. |
| `Icon` in `src/components/Icon.tsx` | One inline SVG family, 1.7 px stroke, `currentColor`, rounded joins. Decorative icons are hidden from assistive technology; icon-only controls have names. |
| `public/hamster.svg`, `public/favicon.svg`, `public/og-image.png` | Original vector character, identity mark, and local 1200 × 630 share image. `scripts/render-share.mjs` reproduces the share asset. |

Every input has a persistent visible label. A skip link reaches the main landmark. Focus outlines are 2 px with a 4 px offset. Primary controls are at least 44 px; a few secondary controls/linked data are smaller but pass the probe’s target-spacing threshold. Hover is gated by pointer capability. Under `prefers-reduced-motion: no-preference`, controls use 120 ms color/background/border transitions, and primary/preset presses scale to 0.96. Reduced motion removes those transitions and smooth scrolling. There are no continuous animations.

## Reuse

Start additional views inside `.page-wrap`, use the same type tokens and heading hierarchy, and reuse `Modal` for short overlays. Give one action the amber fill; use text or neutral controls for peers. Keep important amounts and addresses reachable, and pair status colors with words. Use actual chain data and explicit unavailable/empty states rather than decorative numbers. Keep all runtime assets local and all navigation compatible with static hosting.

Avoid introducing a second font, new accent ramp, shadowed card stacks, or a marketing section above the tip form. New wallet or transaction behavior belongs in the existing configuration and lifecycle modules, not inside visual components.

## Attribution

Design knowledge: [Jakub Krehel’s Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation method: [Paul Bakaus’s Impeccable](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. See [NOTICE.md](NOTICE.md) and the retained [license texts](licenses/Design-guidance-LICENSE).
