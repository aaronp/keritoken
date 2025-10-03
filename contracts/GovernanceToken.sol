// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceToken is Ownable {
    // Set of whitelisted addresses
    mapping(address => bool) private whitelisted;

    // Events
    event AddressAdded(
        address indexed walletAddress,
        string challenge,
        bytes32 hash,
        bytes signature
    );

    event AddressRemoved(
        address indexed walletAddress,
        string reason
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add an address to the whitelist
     * @param walletAddress The address to whitelist
     * @param challenge The challenge string used for verification
     * @param hash The hash of the verification data
     * @param signature The signature proving ownership
     */
    function addAddress(
        address walletAddress,
        string memory challenge,
        bytes32 hash,
        bytes memory signature
    ) external onlyOwner {
        require(walletAddress != address(0), "Cannot whitelist zero address");
        require(!whitelisted[walletAddress], "Address already whitelisted");

        whitelisted[walletAddress] = true;

        emit AddressAdded(walletAddress, challenge, hash, signature);
    }

    /**
     * @dev Remove an address from the whitelist
     * @param walletAddress The address to remove
     * @param reason The reason for removal
     */
    function removeAddress(
        address walletAddress,
        string memory reason
    ) external onlyOwner {
        require(whitelisted[walletAddress], "Address not whitelisted");

        whitelisted[walletAddress] = false;

        emit AddressRemoved(walletAddress, reason);
    }

    /**
     * @dev Check if an address is whitelisted
     * @param walletAddress The address to check
     * @return bool True if the address is whitelisted
     */
    function isWhitelisted(address walletAddress) external view returns (bool) {
        return whitelisted[walletAddress];
    }
}
