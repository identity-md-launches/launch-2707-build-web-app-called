import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useBalance, useConnection } from 'wagmi';
import { formatEther, type Address } from 'viem';
import { chain, CONTRACT_ADDRESS, EXPLORER } from '../config';
import { byteLength, MESSAGE_LIMIT, validateAmount } from '../lib/amount';
import { useTipTransaction } from '../lib/useTipTransaction';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function TipForm({ onConnect }: { onConnect: () => void }) {
  const { address, chainId, isConnected } = useConnection();
  const balance = useBalance({ address, chainId: chain.id, query: { enabled: Boolean(address), refetchInterval: 30_000 } });
  const [amount, setAmount] = useState('0.001');
  const [message, setMessage] = useState('');
  const [amountError, setAmountError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [review, setReview] = useState<{ amount: string; message: string; account: Address } | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const tx = useTipTransaction();
  const wrongChain = isConnected && chainId !== chain.id;
  const usedBytes = byteLength(message);

  useEffect(() => {
    if (tx.submission && (tx.phase === 'pending' || tx.phase === 'unknown')) {
      setAmount(tx.submission.amount);
      setMessage(tx.submission.message);
    }
  }, [tx.submission, tx.phase]);

  useEffect(() => { if (review && (address !== review.account || wrongChain)) setReview(null); }, [address, wrongChain, review]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    tx.reset();
    const parsed = validateAmount(amount);
    const error = parsed.error ?? (balance.data && parsed.value >= balance.data.value ? 'Not enough Sepolia ETH. Leave a little extra for the network fee.' : '');
    const msgError = usedBytes > MESSAGE_LIMIT ? `Shorten your message by ${usedBytes - MESSAGE_LIMIT} bytes. Some characters use more than one.` : '';
    setAmountError(error);
    setMessageError(msgError);
    if (error) { amountRef.current?.focus(); return; }
    if (msgError) { messageRef.current?.focus(); return; }
    if (!isConnected || !address) { onConnect(); return; }
    if (wrongChain || tx.busy) return;
    setReview({ amount: formatEther(parsed.value!), message, account: address });
  }

  return <section className="tip-panel" aria-labelledby="tip-heading" id="tip">
    <div className="panel-heading"><h2 id="tip-heading">Send a little love</h2><Icon name="heart" size={24} /></div>
    <div className="form-network"><span className="network-dot" /> Sepolia testnet <span className="network-caption">Test ETH only</span></div>
    <form onSubmit={onSubmit} noValidate>
      <fieldset disabled={tx.busy}>
        <div className="field-heading"><label htmlFor="amount">Tip amount</label>{address && <span className="balance">{balance.data ? `${formatEther(balance.data.value)} ETH available` : balance.isError ? 'Balance unavailable' : 'Reading balance…'}</span>}</div>
        <div className="amount-input"><Icon name="eth" size={24} /><input ref={amountRef} id="amount" name="amount" type="text" inputMode="decimal" autoComplete="off" value={amount} spellCheck={false}
          aria-invalid={Boolean(amountError)} aria-describedby={amountError ? 'amount-error' : undefined}
          onChange={event => { setAmount(event.target.value); setAmountError(''); }} /><span>ETH</span></div>
        {amountError && <p className="inline-error" id="amount-error">{amountError}</p>}
        <div className="presets" aria-label="Suggested tip amounts">
          {['0.001', '0.005', '0.01'].map(value => <button key={value} type="button" aria-pressed={amount === value} className="preset" onClick={() => { setAmount(value); setAmountError(''); }}><Icon name="seed" size={16} />{value}</button>)}
          <button type="button" className="preset custom" aria-pressed={!['0.001', '0.005', '0.01'].includes(amount)} onClick={() => { amountRef.current?.focus(); amountRef.current?.select(); }}>Custom</button>
        </div>
        <div className="field-heading message-heading"><label htmlFor="message">Leave a message <span className="optional">(optional)</span></label><Icon name="chat" size={16} /></div>
        <textarea ref={messageRef} id="message" name="message" rows={3} value={message} placeholder="Something nice for the hamster…" aria-invalid={usedBytes > MESSAGE_LIMIT || Boolean(messageError)} aria-describedby="message-hint message-counter message-error"
          onChange={event => { setMessage(event.target.value); setMessageError(''); }} />
        <div className="message-meta"><span id="message-hint">Saved publicly on-chain</span><span id="message-counter" className={usedBytes > MESSAGE_LIMIT ? 'over-limit' : ''}>{usedBytes}/{MESSAGE_LIMIT} bytes</span></div>
        <p id="message-error" className="inline-error">{messageError || (usedBytes > MESSAGE_LIMIT ? 'Shorten your message to 140 bytes or fewer.' : '')}</p>
      </fieldset>
      {wrongChain && <p className="inline-error" role="status">Switch to Sepolia using the wallet button above.</p>}
      <button className="button primary submit-tip" type="submit" disabled={wrongChain || tx.busy}>
        {tx.phase === 'preparing' ? 'Checking your tip…' : tx.phase === 'signing' ? 'Confirm in your wallet…' : tx.phase === 'pending' ? 'Waiting for confirmation…' : tx.phase === 'unknown' ? 'Check your pending tip' : isConnected ? 'Review tip' : 'Send a tip'}
        {!tx.busy && <Icon name="arrow" />}
      </button>
      <p className="form-footnote">{isConnected ? 'You’ll review the tip before signing.' : 'Connect a wallet to send your tip.'}</p>
    </form>
    <div className="transaction-status" role="status" aria-live="polite">
      {tx.phase === 'confirmed' && <div className="status-content success"><Icon name="check" /><div><strong>A little love, recorded forever.</strong><p>Your {tx.submission?.amount} ETH tip is confirmed.</p></div></div>}
      {tx.phase === 'pending' && <div className="status-content"><Icon name="clock" /><div><strong>Your tip is on its way.</strong><p>Keep this tab open while Sepolia confirms it.</p></div></div>}
      {tx.error && <p className="inline-error">{tx.error}</p>}
      {tx.submission && <a className="text-link transaction-link" href={`${EXPLORER}/tx/${tx.submission.hash}`} target="_blank" rel="noreferrer">View transaction <Icon name="external" size={14} /></a>}
      {tx.phase === 'unknown' && <button className="text-button" type="button" onClick={tx.recheck}>Check confirmation again</button>}
      {tx.phase === 'confirmed' && <button className="text-button" type="button" onClick={() => { tx.reset(); setMessage(''); amountRef.current?.focus(); }}>Send another tip</button>}
    </div>
    <Modal title="Review your tip" open={Boolean(review)} onClose={() => setReview(null)}>
      {review && <>
        <p className="review-amount"><Icon name="eth" size={28} />{review.amount} <span>ETH</span></p>
        <dl className="review-details"><div><dt>Network</dt><dd>Ethereum Sepolia</dd></div><div><dt>Network fee</dt><dd>Shown in your wallet</dd></div></dl>
        <div className="review-message"><h3>Public message</h3><p dir="auto">{review.message || 'No message'}</p></div>
        <div className="review-contract"><h3>Sent to HamsterTip</h3><a className="full-address" href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS} <Icon name="external" size={14} /></a></div>
        <p className="review-notice">This uses Sepolia test ETH. Tips stay in the contract and cannot be withdrawn. Your message is public and permanent.</p>
        <button className="button primary full-width" type="button" onClick={() => { const value = review; setReview(null); void tx.send(value.amount, value.message, value.account); }}>Confirm {review.amount} ETH tip <Icon name="arrow" /></button>
        <button className="text-button full-width" type="button" onClick={() => setReview(null)}>Edit tip</button>
      </>}
    </Modal>
  </section>;
}
