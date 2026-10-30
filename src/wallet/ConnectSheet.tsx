import { useEffect } from 'react';
import { useConnection, useConnect, useConnectors, useDisconnect, useSwitchChain, type Connector } from 'wagmi';
import { getAddress } from 'viem';
import { chain, EXPLORER } from '../config';
import { shortAddress, friendlyError } from '../lib/amount';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { OPEN_IN, isMobileBrowser } from './open-in';

export function WalletControl({ onOpen, onAccount }: { onOpen: () => void; onAccount: () => void }) {
  const { address, isConnected, chainId } = useConnection();
  const switchChain = useSwitchChain();
  const wrongChain = isConnected && chainId !== chain.id;
  return <div className="wallet-control">
    <button className="button wallet-button" type="button" disabled={switchChain.isPending} onClick={() => {
      if (wrongChain) switchChain.mutate({ chainId: chain.id });
      else if (isConnected) onAccount();
      else onOpen();
    }}>
      <Icon name="wallet" size={18} />
      {wrongChain ? (switchChain.isPending ? 'Switching…' : 'Switch to Sepolia') : address ? shortAddress(getAddress(address)) : 'Connect wallet'}
      {address && !wrongChain && <Icon name="chevron" size={16} />}
    </button>
    {switchChain.error && <p className="wallet-error" role="alert">{friendlyError(switchChain.error)}</p>}
  </div>;
}

export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isConnected } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const mobile = isMobileBrowser();
  const named = connectors.some(c => c.type === 'injected' && c.id !== 'injected');
  const browserHasProvider = named || Boolean((window as Window & { ethereum?: unknown }).ethereum);
  const mobileLinks = mobile && !browserHasProvider;
  const listed = [...connectors.filter(c => c.type === 'injected'), ...connectors.filter(c => c.type !== 'injected')]
    .filter(c => !(c.id === 'injected' && named))
    .filter(c => !mobileLinks || c.type !== 'injected');

  useEffect(() => { if (isConnected && open) onClose(); }, [isConnected, open, onClose]);
  useEffect(() => { if (!open && !connect.isPending) connect.reset(); }, [open]); // Keep an active wallet request pending when the sheet closes.

  const label = (c: Connector) => c.id === 'injected' ? 'Browser wallet' : c.id === 'coinbaseWalletSDK' ? (mobileLinks ? 'Coinbase Smart Wallet' : 'Coinbase Wallet') : c.name;
  return <Modal title="Connect a wallet" open={open} onClose={onClose} className="wallet-sheet">
    <p className="modal-intro">A wallet is your way into the hamster economy.</p>
    <div className="wallet-options">
      {mobileLinks && OPEN_IN.map(wallet => <a className="wallet-row" key={wallet.id} href={wallet.href(window.location.href)}>
        <img src={`./wallets/${wallet.id}.svg`} width="28" height="28" alt="" />
        <span>Open in {wallet.name}</span><Icon name="external" size={16} />
      </a>)}
      {listed.map(connector => <button className="wallet-row" type="button" key={connector.uid} disabled={connect.isPending}
        onClick={() => connect.mutate({ connector, chainId: chain.id })}>
        {connector.icon ? <img src={connector.icon} width="28" height="28" alt="" /> : connector.id === 'coinbaseWalletSDK' ? <img src="./wallets/coinbase.svg" width="28" height="28" alt="" /> : <Icon name="wallet" size={28} />}
        <span>{label(connector)}{connect.isPending && connect.variables?.connector === connector ? ' · opening…' : ''}</span>
        <Icon name="arrow" size={16} />
      </button>)}
    </div>
    <p className="inline-error" role="status">{connect.error ? friendlyError(connect.error) : ''}</p>
    <p className="modal-footnote"><Icon name="info" size={16} /> Connecting does not send a tip.</p>
  </Modal>;
}

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address } = useConnection();
  const disconnect = useDisconnect();
  return <Modal title="Your wallet" open={open} onClose={onClose}>
    <p className="modal-intro">Connected to HamsterTip</p>
    {address && <a className="full-address" href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">{getAddress(address)} <Icon name="external" size={16} /></a>}
    <button className="button secondary full-width" type="button" onClick={() => { disconnect.mutate({}); onClose(); }}><Icon name="logout" /> Disconnect</button>
  </Modal>;
}
