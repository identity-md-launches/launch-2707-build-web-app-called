import { useQuery } from '@tanstack/react-query';
import { getAddress, zeroAddress, type Address } from 'viem';
import { abi, CONTRACT_ADDRESS, publicClient } from '../config';

export type Tip = { tipper: Address; amount: bigint; message: string; timestamp: bigint };
export type Leader = { address: Address; total: bigint };

export async function readEconomy() {
  // All reads use one block, so totals, messages and rankings describe the same snapshot.
  const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
  const contract = { address: CONTRACT_ADDRESS, abi, blockNumber } as const;
  const [tips, addresses] = await Promise.all([
    publicClient.readContract({ ...contract, functionName: 'getTips' }),
    publicClient.readContract({ ...contract, functionName: 'getLeaderboard' }),
  ]);
  const leaders: Leader[] = await Promise.all(addresses.filter(address => address !== zeroAddress).map(async address => ({
    address: getAddress(address),
    total: await publicClient.readContract({ ...contract, functionName: 'totalTipped', args: [address] }),
  })));
  return {
    tips: [...tips].reverse(),
    leaders,
    total: tips.reduce((sum, tip) => sum + tip.amount, 0n),
    tipperCount: new Set(tips.map(tip => tip.tipper.toLowerCase())).size,
    blockNumber,
  };
}

export function useEconomy() {
  return useQuery({
    queryKey: ['economy', CONTRACT_ADDRESS],
    queryFn: readEconomy,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}
