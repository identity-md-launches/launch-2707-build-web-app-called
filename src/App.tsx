import { useCallback, useState } from 'react';
import { TipForm } from './components/TipForm';
import { Community } from './components/Community';
import { Icon } from './components/Icon';
import { Modal } from './components/Modal';
import { AccountSheet, ConnectSheet, WalletControl } from './wallet/ConnectSheet';
import { CONTRACT_ADDRESS, EXPLORER } from './config';

export default function App() {
  const [connectOpen, setConnectOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const closeConnect = useCallback(() => setConnectOpen(false), []);
  const openConnect = useCallback(() => setConnectOpen(true), []);

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="header-inner"><a className="brand" href="#" aria-label="HamsterTip home"><img src="./favicon.svg" width="38" height="38" alt="" /><span>HamsterTip<span className="brand-dot">.</span></span></a>
        <nav aria-label="Main navigation"><a href="#leaderboard">Leaderboard</a><button type="button" onClick={() => setHelpOpen(true)}>How it works <Icon name="info" size={16} /></button></nav>
        <WalletControl onOpen={openConnect} onAccount={() => setAccountOpen(true)} />
      </div>
    </header>
    <main id="main" className="page-wrap">
      <div className="tip-layout">
        <section className="intro" aria-labelledby="main-title">
          <h1 id="main-title">Tip ETH.<br /><span>Spread the squeek.</span></h1>
          <p className="intro-description">A little on-chain love for the Squeekchain hamster economy.</p>
          <div className="mascot-scene"><img className="mascot" src="./hamster.svg" width="480" height="360" alt="A happy hamster holding an Ethereum coin" /><span className="mascot-note">Small paws. Big appreciation.<svg viewBox="0 0 80 40" aria-hidden="true"><path d="M76 4C61 31 23 8 5 30m0 0 4-13M5 30l14-3" /></svg></span></div>
          <div className="intro-note"><Icon name="heart" size={16} /> Every tip counts. Every message stays.</div>
        </section>
        <TipForm onConnect={openConnect} />
      </div>
      <Community onConnect={openConnect} />
      <div className="about-strip"><div className="about-symbol"><Icon name="seed" size={28} /></div><div><h2>Good things grow from little things.</h2><p>Pick an amount, leave a note, and become part of the hamster economy.</p></div><button className="text-button" type="button" onClick={() => setHelpOpen(true)}>How it works <Icon name="arrow" size={18} /></button></div>
    </main>
    <footer className="site-footer"><div className="footer-inner"><p>Made for the little guys.<span>HamsterTip · Squeekchain</span></p><div className="footer-links"><span className="footer-network"><span className="network-dot" /> Ethereum Sepolia</span><a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract <Icon name="external" size={14} /></a><a href="https://github.com/BaoBaoSG/hamster-tip" target="_blank" rel="noreferrer">GitHub <Icon name="external" size={14} /></a></div></div></footer>
    <ConnectSheet open={connectOpen} onClose={closeConnect} />
    <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    <Modal title="A little guide to tipping" open={helpOpen} onClose={() => setHelpOpen(false)}>
      <ol className="help-steps"><li><span>1</span><div><h3>Bring a wallet</h3><p>Connect a browser wallet, open HamsterTip inside a mobile wallet, or create a Coinbase Smart Wallet.</p></div></li><li><span>2</span><div><h3>Use Sepolia test ETH</h3><p>Switch to Ethereum Sepolia. You’ll need test ETH for your tip and the network fee.</p></div></li><li><span>3</span><div><h3>Leave a little love</h3><p>Choose an amount and an optional message. Review the details, then confirm in your wallet. A confirmed tip updates your total on the leaderboard.</p></div></li></ol>
      <div className="help-note"><Icon name="info" /><p>Messages are public and permanent, with a 140-byte limit. Tips stay in the contract, which has no withdrawal function. HamsterTip uses test ETH, not mainnet ETH.</p></div>
      <a className="text-link" href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Explore the Sepolia contract <Icon name="external" size={16} /></a>
    </Modal>
  </>;
}
