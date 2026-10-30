import { useEffect, useRef, useState } from 'react';
import { useWriteContract } from 'wagmi';
import { getConnection } from 'wagmi/actions';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, isAddress, type Address, type Hash } from 'viem';
import { abi, chain, config, CONTRACT_ADDRESS, publicClient } from '../config';
import { byteLength, friendlyError, validateAmount } from './amount';

type Submission = { hash: Hash; account: Address; amount: string; message: string };
type Phase = 'idle' | 'preparing' | 'signing' | 'pending' | 'confirmed' | 'error' | 'unknown';
const storageKey = `hamstertip:pending:${chain.id}:${CONTRACT_ADDRESS}`;

function restore(): Submission | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (value && /^0x[\da-f]{64}$/i.test(value.hash) && isAddress(value.account) &&
      typeof value.amount === 'string' && validateAmount(value.amount).value &&
      typeof value.message === 'string' && byteLength(value.message) <= 140) return value;
  } catch { /* Storage is optional; never prevent a wallet interaction. */ }
  return null;
}

export function useTipTransaction() {
  const [submission, setSubmission] = useState<Submission | null>(restore);
  const [phase, setPhase] = useState<Phase>(() => restore() ? 'pending' : 'idle');
  const [error, setError] = useState('');
  const [check, setCheck] = useState(0);
  const inFlight = useRef(false);
  const write = useWriteContract();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!submission || phase !== 'pending') return;
    let current = true;
    try { sessionStorage.setItem(storageKey, JSON.stringify(submission)); } catch { /* Optional storage. */ }
    publicClient.waitForTransactionReceipt({
      hash: submission.hash,
      confirmations: 1,
      timeout: 120_000,
      pollingInterval: 4_000,
      onReplaced: replacement => {
        if (current) setSubmission(previous => previous ? { ...previous, hash: replacement.transaction.hash } : previous);
      },
    }).then(receipt => {
      if (!current) return;
      const tipped = receipt.status === 'success' && receipt.logs.some(log => {
        if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) return false;
        try {
          const event = decodeEventLog({ abi, data: log.data, topics: log.topics, eventName: 'Tipped' });
          return event.args.tipper.toLowerCase() === submission.account.toLowerCase() &&
            event.args.amount === validateAmount(submission.amount).value && event.args.message === submission.message;
        } catch { return false; }
      });
      try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
      inFlight.current = false;
      if (tipped) {
        setPhase('confirmed');
        void queryClient.invalidateQueries({ queryKey: ['economy'] });
        void queryClient.invalidateQueries({ queryKey: ['balance'] });
      } else {
        setPhase('error');
        setError(receipt.status === 'reverted'
          ? 'The transaction reverted. Your tip was not recorded; a network fee may still apply.'
          : 'This transaction did not record the reviewed tip. It may have been replaced or cancelled. Check it on Etherscan.');
      }
    }).catch(() => {
      if (current) {
        setPhase('unknown');
        setError('Confirmation is taking longer than expected. Check the transaction before sending another tip.');
      }
    });
    return () => { current = false; };
  }, [submission, phase, check, queryClient]);

  async function send(amount: string, message: string, account: Address) {
    if (inFlight.current || phase === 'pending' || phase === 'unknown') return;
    const parsed = validateAmount(amount);
    if (parsed.error || byteLength(message) > 140) return;
    inFlight.current = true;
    setError('');
    setSubmission(null);
    setPhase('preparing');
    try {
      const { request } = await publicClient.simulateContract({
        address: CONTRACT_ADDRESS, abi, functionName: 'tip', args: [message], value: parsed.value, account,
      });
      const current = getConnection(config);
      if (current.address?.toLowerCase() !== account.toLowerCase() || current.chainId !== chain.id) {
        throw new Error('Chain mismatch: reconnect the reviewed wallet on Sepolia.');
      }
      setPhase('signing');
      const hash = await write.mutateAsync({ ...request, chainId: chain.id });
      setSubmission({ hash, amount, message, account });
      setPhase('pending');
    } catch (cause) {
      setError(friendlyError(cause));
      setPhase('error');
      inFlight.current = false;
    }
  }

  return {
    phase, submission, error, send,
    busy: ['preparing', 'signing', 'pending', 'unknown'].includes(phase),
    recheck: () => { setError(''); setPhase('pending'); setCheck(value => value + 1); },
    reset: () => { if (['confirmed', 'error'].includes(phase)) { setPhase('idle'); setError(''); setSubmission(null); } },
  };
}
