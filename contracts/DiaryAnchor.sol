// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title  DiaryAnchor
/// @notice Lưu SHA-256 hash của dữ liệu mùa vụ (season + diary) lên blockchain.
///         Mỗi lần neo (anchor) là 1 lần gọi hàm anchor() → emit event → immutable trên chain.
///
/// @dev    Deploy 1 lần lên Sepolia testnet (dùng Remix IDE hoặc script deploy).
///         Sau khi deploy, copy địa chỉ contract vào env: ANCHOR_CONTRACT_ADDRESS=0x...
contract DiaryAnchor {
    /// @notice Emitted mỗi khi 1 mùa vụ được neo lên chain.
    /// @param seasonId   UUID chuỗi của mùa vụ (dễ đọc trên explorer).
    /// @param dataHash   SHA-256 hash của canonical JSON payload (32 bytes).
    /// @param anchoredAt Block timestamp lúc neo.
    /// @param anchoredBy Địa chỉ ví gửi transaction.
    event Anchored(
        string  seasonId,
        bytes32 indexed dataHash,
        uint256 anchoredAt,
        address indexed anchoredBy
    );

    /// @param seasonId  UUID string của season cần neo.
    /// @param dataHash  32-byte SHA-256 digest của canonical JSON (hex, không prefix 0x trong code off-chain).
    function anchor(string calldata seasonId, bytes32 dataHash) external {
        emit Anchored(seasonId, dataHash, block.timestamp, msg.sender);
    }
}
