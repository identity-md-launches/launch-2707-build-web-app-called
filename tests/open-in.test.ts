import { describe, expect, it } from 'vitest';
import { OPEN_IN } from '../src/wallet/open-in';

describe('Mobile wallet links preserve the hosted subpath, query, and hash', () => {
  const page = 'https://baobaosg.github.io/hamster-tip/?ref=a%20b#tip';
  it('offers all four mobile wallets in the required order', () => {
    expect(OPEN_IN.map(wallet => wallet.id)).toEqual(['metamask', 'coinbase', 'rabby', 'phantom']);
  });
  it('uses MetaMask’s dapp path', () => expect(OPEN_IN[0].href(page)).toBe(`https://link.metamask.io/dapp/${page.slice(8)}`));
  it('encodes Coinbase’s cb_url', () => expect(new URL(OPEN_IN[1].href(page)).searchParams.get('cb_url')).toBe(page));
  it('uses Rabby’s documented source handler parameters', () => {
    const url = new URL(OPEN_IN[2].href(page));
    expect(url.pathname).toBe('/mobile/');
    expect(url.searchParams.get('_cmd')).toBe('open-dapp');
    expect(url.searchParams.get('dapp')).toBe(page);
  });
  it('encodes Phantom’s browse path and origin', () => {
    const url = new URL(OPEN_IN[3].href(page));
    expect(decodeURIComponent(url.pathname.slice('/ul/browse/'.length))).toBe(page);
    expect(url.searchParams.get('ref')).toBe('https://baobaosg.github.io');
  });
});
