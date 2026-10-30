import { parseEther } from 'viem';

export const MESSAGE_LIMIT = 140;
export const byteLength = (message: string) => new TextEncoder().encode(message).length;

export function validateAmount(input: string): { value: bigint; error?: never } | { value?: never; error: string } {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(input)) {
    return { error: 'Enter an amount in ETH, such as 0.001.' };
  }
  if ((input.split('.')[1]?.length ?? 0) > 18) {
    return { error: 'Use at most 18 decimal places.' };
  }
  try {
    const value = parseEther(input);
    if (value <= 0n) return { error: 'Enter an amount greater than 0 ETH.' };
    if (value >= 2n ** 256n) return { error: 'This amount is too large. Enter a smaller tip.' };
    return { value };
  } catch {
    return { error: 'Enter an amount in ETH, such as 0.001.' };
  }
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function friendlyError(error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/reject|denied|4001/i.test(text)) return 'Request declined in your wallet. You can try again when you’re ready.';
  if (/insufficient|exceeds.*balance/i.test(text)) return 'Not enough Sepolia ETH. Leave a little extra for the network fee.';
  if (/chain.*mismatch|chain.*not.*configured|wrong.*chain/i.test(text)) return 'Switch your wallet to Sepolia and try again.';
  if (/not found|not installed|ProviderNotFound/i.test(text)) return 'No browser wallet found. Install a wallet extension or choose Coinbase Wallet.';
  if (/revert/i.test(text)) return 'The contract could not accept this tip. Check the amount and message, then try again.';
  return 'Could not reach your wallet or Sepolia. Check your connection and try again.';
}
