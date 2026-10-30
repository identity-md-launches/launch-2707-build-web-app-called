# HamsterTip

A static React app for tipping the Squeekchain hamster economy with Sepolia ETH. Send a public message, see recent tips, and follow the contract’s top-10 leaderboard.

The included `dist/` is the production export. It contains all fonts, illustrations, wallet marks, JavaScript, CSS, favicon, and share image. Serve it as a static directory; there is no backend, secret, relay, project ID, or deployment step.

## Install, develop, and rebuild

Use Node.js **22.12 or newer** and npm. The lockfile pins the installed dependency tree.

```sh
npm ci
npm run dev
```

For the production site:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Open the URL printed by Vite. `npm run build` replaces `dist/`; include that directory when submitting or publishing updates. The publisher can serve the existing export without rebuilding. Vite’s `base` is `./`, assets are relative, and navigation uses page anchors, so a static gateway subpath works without server rewrites. Serve through HTTP(S), not by opening `index.html` as a `file:` URL. Wallets need a secure context (HTTPS or localhost).

## Chain and wallet behavior

| Setting | Value |
| --- | --- |
| Network | Ethereum Sepolia, chain ID `11155111` (`0xaa36a7`) |
| Contract | `0x20D901D65c3801774FBeb147A1D04818584C9d2c` |
| Primary RPC | `https://ethereum-sepolia-rpc.publicnode.com` |
| Fallback RPC | `https://rpc.sepolia.org` |
| Explorer | [Sepolia Etherscan contract](https://sepolia.etherscan.io/address/0x20D901D65c3801774FBeb147A1D04818584C9d2c) |

The contract address, ABI, chain definition, connectors, and transports are in [src/config.ts](src/config.ts). The ABI follows the [original contract at commit `9d5713d`](https://github.com/BaoBaoSG/hamster-tip/blob/9d5713d5c27da94ae6608e59c4bf273765a62de9/HamsterTip.sol). An unchanged copy is included in [contracts/HamsterTip.sol](contracts/HamsterTip.sol) for reference; this project does not deploy or alter it.

- Browser wallets are discovered by EIP-6963 and listed by name and icon. A generic browser wallet is offered only when no named extension is discovered.
- Mobile browsers offer MetaMask, Coinbase Wallet, Rabby, and Phantom links that open the current page in the wallet’s browser. Coinbase Smart Wallet is available through the Coinbase SDK. No WalletConnect relay is configured.
- The header shows the connected address and opens full-address/disconnect details. A wrong network changes the control to **Switch to Sepolia**; the connector can add Sepolia if needed. Tip submission stays disabled on the wrong chain.
- Users select a preset or enter an exact amount with up to 18 decimal places. Messages are limited to **140 UTF-8 bytes**, as required by Solidity, rather than 140 JavaScript characters.
- **Review tip** shows the full amount, chain, destination, public message, and fee disclosure. Confirming first simulates `tip(message)`, checks the connected account and chain again, then requests a wallet signature. Connecting alone never sends a transaction.
- Confirmation requires a successful receipt and a matching `Tipped` event from the specified contract. Rejections, reverts, and unavailable confirmations have distinct states. A submitted transaction is retained in session storage when available so a reload in the same tab can continue checking it. This is transaction recovery, not shared application data.

**Sepolia test ETH only.** Tips stay in the deployed contract; its source has no withdrawal function. Messages are public and permanent. The fee is shown by the signing wallet, and is separate from the tip. No mainnet transaction is constructed.

## On-chain data

The community view works without a connected wallet. It reads `getTips()`, `getLeaderboard()`, and each leader’s `totalTipped(address)` at the same block. ETH sums use `bigint`, and displayed amounts preserve full precision. Zero-address leaderboard slots are excluded because they are the contract’s empty slots.

Data refreshes every 30 seconds while the page is active, on focus, on manual refresh, and after a confirmed tip. The app distinguishes loading, a verified empty contract, an unavailable RPC, and a stale last successful snapshot. It never substitutes sample tips or browser-local rankings for on-chain data. Recent tips are shown newest first, five at a time; **My tips** filters the actual fetched records by connected address.

The supplied contract returns its entire tip history. This works for its current size, but a large future history may exceed an RPC response or execution limit. An indexed data service or paginated contract would be needed at that scale; neither is fabricated here.

## Browser validation

The regression harness starts and closes its own static server under `/preview/`. Wallet and chain fixtures exist only in the test process. It does **not** sign or broadcast transactions.

```sh
npx playwright install chromium webkit
npm run build
npm run test:browser
```

Linux may also need Playwright’s OS dependencies (`npx playwright install-deps chromium webkit`, where permitted). To run one engine, use `npm run test:browser -- --browser=chromium` or `--browser=webkit`. Evidence is written to ignored `test/scratch/browser-results/`.

The share image can be reproduced from the local artwork and font with `npm run render:share` after installing Chromium, followed by `npm run build`.

### Actual results

Worker validation on 2026-10-30:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed, no TypeScript errors |
| `npm test` | 26 tests passed in 2 files |
| `npm run build` | Passed; static export generated |
| `npm run test:browser` | 20 groups passed: 10 each in Chromium and WebKit |
| Automated accessibility | No WCAG A/AA violations detected in tested populated pages and mobile wallet dialogs |
| Live Sepolia reads | Chain ID, deployed bytecode, and empty tip count verified; page read current empty leaderboard without a wallet |
| Responsive checks | 320, 390, 768, 1060, and 1440 CSS pixels; no horizontal overflow in tested states |
| First screen at 390 × 844 | Product, complete form, and main action visible; button ends at approximately y=714 |
| Pinned taste@1 probe | 14/16 raw checks passed; two confirmed heuristic false positives documented below |

The production build reports a 603 kB minified main chunk (about 182 kB gzip) and a transitive `node:worker_threads` externalization warning from an unused Tempo module. The tested EVM/browser paths run without script errors. Neither warning is suppressed.

The raw probe flags the header’s working **Connect wallet** control as a kicker and the amount input’s bordered wrapper as a nested card. Both were inspected and retained as functional controls. The actual contrast, lower mobile layout, and stats semantics findings were fixed. See [artifacts/validation.md](artifacts/validation.md) for six-domain coverage, findings, evidence, and precise limitations; [DESIGN.md](DESIGN.md) documents the final design.

No funded wallet, physical phone wallet handoff, Coinbase passkey creation, native screen reader, or browser-native 200% zoom was tested. The browser suite uses wallet/RPC fixtures for signing states and 200% text enlargement for its enlargement check. Real transactions and vendor wallet services still depend on the visitor’s wallet and the network. Hosting, publishing, and contract deployment are outside this delivery.

## Source layout and licenses

- `src/components/`: tip form, community views, native modal, shared icons.
- `src/wallet/`: single wallet picker and mobile links.
- `src/lib/`: precise validation, chain reads, and transaction lifecycle.
- `public/`: local runtime assets, copied to `dist/` by Vite.
- `tests/`: 26 unit tests and the two-engine browser regression harness.
- `artifacts/`: final screenshots and worker validation evidence.

Original product: [BaoBaoSG/hamster-tip](https://github.com/BaoBaoSG/hamster-tip), [existing frontend](https://baobaosg.github.io/hamster-tip/). Wallet configuration follows the pinned connector reference, adapted to [Wagmi 3’s current hook API](https://wagmi.sh/react/guides/migrate-from-v2-to-v3). Rabby’s link uses the `_cmd=open-dapp&dapp=` handler in its [mobile source](https://github.com/RabbyHub/RabbyMobile/blob/develop/apps/mobile/src/hooks/universalLink.ts).

Design review uses Jakub Krehel’s Better Interface, with documentation guidance adapted from Paul Bakaus’s Impeccable. Attribution and license files are in [licenses/](licenses/); see [NOTICE.md](NOTICE.md). The hamster, favicon, share composition, and interface icons were created for this implementation. DM Sans is bundled under the SIL Open Font License; wallet marks retain their original branding.

The `.gitignore` path budget is **256 bytes** (actual: 90 bytes). It excludes dependency/cache directories at every nesting level and scratch browser output, while leaving `dist/` included. No dependency tree, registry mirror, package archive, or submodule is part of the submission.
