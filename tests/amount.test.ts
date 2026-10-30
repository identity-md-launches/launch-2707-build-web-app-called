import { describe, expect, it } from 'vitest';
import { byteLength, validateAmount } from '../src/lib/amount';
import { formatEther, parseEther } from 'viem';

describe('Amounts match the payable contract without rounding', () => {
  it.each(['0.001', '1', '.5', '1.', '0.000000000000000001'])('accepts %s exactly', amount => {
    expect(validateAmount(amount).value).toBe(parseEther(amount));
  });
  it.each(['', '0', '0.0', '-1', '1e2', 'Infinity', 'NaN', '1,000', ' 0.1', '0.0000000000000000001', '1.2.3'])('rejects %s', amount => {
    expect(validateAmount(amount).error).toBeTruthy();
  });
  it('rejects amounts outside uint256', () => {
    expect(validateAmount('9'.repeat(100)).error).toBeTruthy();
  });
  it('preserves the complete ETH amount for review and display', () => {
    const amount = '0.001234567891234567';
    expect(formatEther(validateAmount(amount).value!)).toBe(amount);
    expect(formatEther(validateAmount('0.000000000000000001').value!)).toBe('0.000000000000000001');
  });
});

describe('Solidity bytes(message).length', () => {
  it('allows 140 ASCII bytes', () => expect(byteLength('a'.repeat(140))).toBe(140));
  it('counts multibyte emoji, not JavaScript code units', () => {
    expect(byteLength('🐹'.repeat(35))).toBe(140);
    expect(byteLength('🐹'.repeat(36))).toBe(144);
  });
  it('counts composed and non-Latin text in UTF-8', () => {
    expect(byteLength('é')).toBe(2);
    expect(byteLength('你好')).toBe(6);
    expect(byteLength('')).toBe(0);
  });
});
