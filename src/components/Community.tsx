import { useState } from 'react';
import { useConnection } from 'wagmi';
import { formatEther, getAddress } from 'viem';
import { useEconomy } from '../lib/data';
import { shortAddress } from '../lib/amount';
import { EXPLORER } from '../config';
import { Icon } from './Icon';

export function Community({ onConnect }: { onConnect: () => void }) {
  const economy = useEconomy();
  const { address } = useConnection();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [visible, setVisible] = useState(5);
  const { data, isPending, isFetching, isError } = economy;
  const tips = data?.tips.filter(tip => filter === 'all' || tip.tipper.toLowerCase() === address?.toLowerCase()) ?? [];
  const unavailable = !data && isError;
  const status = isFetching ? 'Reading Sepolia…' : isError ? (data ? 'Showing last successful update' : 'Sepolia is unavailable') : `Synced at ${new Date(economy.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return <section className="community" id="community" aria-labelledby="community-heading">
    <div className="community-heading"><h2 id="community-heading">A small tip goes a long way.</h2><div className="data-status"><span className={`network-dot ${isError ? 'muted-dot' : ''}`} /><span>{status}</span><button className="icon-button" type="button" aria-label="Refresh community data" title="Refresh community data" onClick={() => void economy.refetch()} disabled={isFetching}><Icon name="refresh" size={18} /></button></div></div>
    {isError && <div className="data-error" role="status"><Icon name="info" /><p>{data ? 'The latest update could not load. These numbers are from the last successful read.' : 'Could not load tips from Sepolia. Check your connection and try again.'}</p><button type="button" className="text-button" onClick={() => void economy.refetch()} disabled={isFetching}>{isFetching ? 'Retrying…' : 'Try again'}</button></div>}
    <div className="stats">
      <div className="stat"><span className="stat-icon"><Icon name="eth" size={24} /></span><dl><dt>Total tipped</dt><dd title={data ? `${formatEther(data.total)} ETH` : undefined}>{data ? formatEther(data.total) : isPending ? '…' : 'Unavailable'}{data && <span> ETH</span>}</dd></dl></div>
      <div className="stat"><span className="stat-icon"><Icon name="heart" size={24} /></span><dl><dt>Tips sent</dt><dd>{data ? data.tips.length.toLocaleString() : isPending ? '…' : 'Unavailable'}</dd></dl></div>
      <div className="stat"><span className="stat-icon"><Icon name="seed" size={24} /></span><dl><dt>Kind hamsters</dt><dd>{data ? data.tipperCount.toLocaleString() : isPending ? '…' : 'Unavailable'}</dd></dl></div>
    </div>
    <div className="community-grid">
      <section className="leaderboard" id="leaderboard" aria-labelledby="leaderboard-heading">
        <div className="section-heading"><h3 id="leaderboard-heading"><Icon name="trophy" size={22} /> Top tippers</h3><span className="meta">All time · Top 10</span></div>
        <p className="section-description">Big hearts. A place in the hamster hall of fame.</p>
        {isPending ? <div className="empty-state" role="status"><Icon name="clock" size={32} /><p>Reading the on-chain leaderboard…</p></div> : unavailable ? <div className="empty-state"><Icon name="trophy" size={32} /><p>Rankings will appear when Sepolia reconnects.</p></div> : data?.leaders.length ? <ol className="leader-list">
          {data.leaders.map((leader, index) => <li key={leader.address}><span className={`rank rank-${index + 1}`}>{index + 1}</span><div className="leader-address"><a href={`${EXPLORER}/address/${leader.address}`} target="_blank" rel="noreferrer" title={leader.address}><span className="address-short">{shortAddress(leader.address)}</span><span className="sr-only"> {leader.address} on Etherscan</span></a>{leader.address.toLowerCase() === address?.toLowerCase() && <span className="you-label">You</span>}</div><span className="leader-total" title={`${formatEther(leader.total)} ETH`}>{formatEther(leader.total)} <span>ETH</span></span></li>)}
        </ol> : <div className="empty-state"><span className="empty-icon"><Icon name="trophy" size={30} /></span><h4>The first spot could be yours.</h4><p>Every tip adds to your on-chain total.</p><a className="text-link" href="#tip">Send the first tip <Icon name="arrow" size={16} /></a></div>}
        <p className="section-footnote"><Icon name="info" size={14} /> Ranked by total ETH tipped, directly from the contract.</p>
      </section>
      <section className="activity" aria-labelledby="activity-heading">
        <div className="section-heading"><h3 id="activity-heading"><Icon name="chat" size={22} /> Little notes, big love</h3><div className="filter-group" aria-label="Filter tips"><button type="button" aria-pressed={filter === 'all'} onClick={() => { setFilter('all'); setVisible(5); }}>All tips</button><button type="button" aria-pressed={filter === 'mine'} onClick={() => { setFilter('mine'); setVisible(5); }}>My tips</button></div></div>
        <p className="section-description">The latest squeeks from the community.</p>
        {filter === 'mine' && !address ? <div className="empty-state"><span className="empty-icon"><Icon name="wallet" size={30} /></span><h4>Your kindness lives here.</h4><p>Connect your wallet to find your tips.</p><button className="text-button" type="button" onClick={onConnect}>Choose a wallet <Icon name="arrow" size={16} /></button></div> : isPending ? <div className="empty-state" role="status"><Icon name="clock" size={32} /><p>Reading recent tips…</p></div> : unavailable ? <div className="empty-state"><Icon name="chat" size={32} /><p>Messages will appear when Sepolia reconnects.</p></div> : tips.length ? <>
          <ol className="tip-list">{tips.slice(0, visible).map((tip, index) => <li key={`${tip.tipper}-${tip.timestamp}-${index}`}>
            <div className="tip-avatar" aria-hidden="true"><Icon name="seed" size={22} /></div><div className="tip-entry"><div className="tip-byline"><a href={`${EXPLORER}/address/${tip.tipper}`} target="_blank" rel="noreferrer" title={getAddress(tip.tipper)}>{shortAddress(getAddress(tip.tipper))}<span className="sr-only"> {getAddress(tip.tipper)} on Etherscan</span></a><span className="tip-value" title={`${formatEther(tip.amount)} ETH`}>{formatEther(tip.amount)} ETH</span></div><p className={`tip-message ${tip.message ? '' : 'no-message'}`} dir="auto">{tip.message || 'A little love, no words needed.'}</p><time dateTime={new Date(Number(tip.timestamp) * 1000).toISOString()}>{new Date(Number(tip.timestamp) * 1000).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div>
          </li>)}</ol>
          {visible < tips.length && <button className="text-button full-width" type="button" onClick={() => setVisible(value => value + 5)}>Show more tips <Icon name="chevron" size={16} /></button>}
        </> : <div className="empty-state"><span className="empty-icon"><Icon name="chat" size={30} /></span><h4>{filter === 'mine' ? 'Your first squeek is waiting.' : 'It starts with a little kindness.'}</h4><p>{filter === 'mine' ? 'Your confirmed tips will appear here.' : 'Leave the first message for the hamster.'}</p><a className="text-link" href="#tip">Write a little note <Icon name="arrow" size={16} /></a></div>}
      </section>
    </div>
  </section>;
}
