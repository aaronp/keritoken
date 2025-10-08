// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceToken is Ownable {
    // Set of whitelisted addresses
    mapping(address => bool) private whitelisted;

    // Events
    event AddressAdded(
        address indexed walletAddress,
        string referenceId
    );

    event AddressRemoved(
        address indexed walletAddress,
        string referenceId
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add an address to the whitelist
     * @param walletAddress The address to whitelist
     * @param referenceId A reference string for auditing (e.g. KYC ID, user identifier)
     */
    function addAddress(
        address walletAddress,
        string memory referenceId
    ) external onlyOwner {
        require(walletAddress != address(0), "Cannot whitelist zero address");
        require(!whitelisted[walletAddress], "Address already whitelisted");

        whitelisted[walletAddress] = true;

        emit AddressAdded(walletAddress, referenceId);
    }

    /**
     * @dev Remove an address from the whitelist
     * @param walletAddress The address to remove
     * @param referenceId A reference string for auditing (e.g. reason for removal)
     */
    function removeAddress(
        address walletAddress,
        string memory referenceId
    ) external onlyOwner {
        require(whitelisted[walletAddress], "Address not whitelisted");

        whitelisted[walletAddress] = false;

        emit AddressRemoved(walletAddress, referenceId);
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
