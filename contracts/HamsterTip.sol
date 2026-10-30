// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HamsterTip
/// @notice Tip ETH to the hamster economy on Squeekchain (Sepolia).
///         Every tip is recorded on-chain with a message and tracked in a leaderboard.
contract HamsterTip {
    struct Tip {
        address tipper;
        uint256 amount;
        string  message;
        uint256 timestamp;
    }

    // Ordered list of all tips
    Tip[] public tips;

    // Total ETH tipped per address
    mapping(address => uint256) public totalTipped;

    // Top-10 leaderboard (addresses)
    address[10] public leaderboard;

    event Tipped(address indexed tipper, uint256 amount, string message);

    /// @notice Send ETH tip with an optional message (max 140 chars)
    function tip(string calldata message) external payable {
        require(msg.value > 0, "tip: value required");
        require(bytes(message).length <= 140, "tip: message too long");

        tips.push(Tip({
            tipper:    msg.sender,
            amount:    msg.value,
            message:   message,
            timestamp: block.timestamp
        }));

        totalTipped[msg.sender] += msg.value;
        _updateLeaderboard(msg.sender);

        emit Tipped(msg.sender, msg.value, message);
    }

    /// @notice Return all tips (tipper, amount, message, timestamp)
    function getTips() external view returns (Tip[] memory) {
        return tips;
    }

    /// @notice Total number of tips ever sent
    function tipCount() external view returns (uint256) {
        return tips.length;
    }

    /// @notice Return current top-10 leaderboard addresses
    function getLeaderboard() external view returns (address[10] memory) {
        return leaderboard;
    }

    // --- internal ---

    /// @dev Bubble the caller up the leaderboard if their total surpasses any slot
    function _updateLeaderboard(address tipper) internal {
        uint256 total = totalTipped[tipper];

        // Check if already in leaderboard
        for (uint8 i = 0; i < 10; i++) {
            if (leaderboard[i] == tipper) {
                _sortLeaderboard();
                return;
            }
        }

        // Replace the weakest slot if caller tips more
        uint8 weakest = 0;
        for (uint8 i = 1; i < 10; i++) {
            if (totalTipped[leaderboard[i]] < totalTipped[leaderboard[weakest]]) {
                weakest = i;
            }
        }
        if (total > totalTipped[leaderboard[weakest]]) {
            leaderboard[weakest] = tipper;
        }
        _sortLeaderboard();
    }

    /// @dev Simple insertion sort on leaderboard (10 elements — gas is fine)
    function _sortLeaderboard() internal {
        for (uint8 i = 1; i < 10; i++) {
            address key = leaderboard[i];
            uint256 keyVal = totalTipped[key];
            int8 j = int8(i) - 1;
            while (j >= 0 && totalTipped[leaderboard[uint8(j)]] < keyVal) {
                leaderboard[uint8(j + 1)] = leaderboard[uint8(j)];
                j--;
            }
            leaderboard[uint8(j + 1)] = key;
        }
    }
}
