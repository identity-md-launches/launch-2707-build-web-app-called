import { createConfig, fallback, http } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { createPublicClient, getAddress, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';

export const CONTRACT_ADDRESS = getAddress('0x20D901D65c3801774FBeb147A1D04818584C9d2c');
export const RPC_URLS = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'] as const;
export const chain = {
  ...sepolia,
  rpcUrls: { default: { http: [...RPC_URLS] } },
};
export const EXPLORER = 'https://sepolia.etherscan.io';

// Derived from BaoBaoSG/hamster-tip, commit 9d5713d5c27da94ae6608e59c4bf273765a62de9.
export const abi = parseAbi([
  'function tip(string message) payable',
  'function getTips() view returns ((address tipper, uint256 amount, string message, uint256 timestamp)[])',
  'function tipCount() view returns (uint256)',
  'function getLeaderboard() view returns (address[10])',
  'function totalTipped(address) view returns (uint256)',
  'event Tipped(address indexed tipper, uint256 amount, string message)',
]);

const transport = () => fallback(RPC_URLS.map(url => http(url, { timeout: 10_000, retryCount: 0 })), { retryCount: 1 });

export const config = createConfig({
  chains: [chain],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'HamsterTip',
      appLogoUrl: new URL('./favicon.svg', document.baseURI).href,
      preference: { options: 'all' },
    }),
  ],
  transports: { [chain.id]: transport() },
});

export const publicClient = createPublicClient({ chain, transport: transport() });
