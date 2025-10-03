// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GovernanceToken.sol";

contract Token is ERC20, Ownable {
    GovernanceToken public governanceToken;

    constructor(address _governanceTokenAddress) ERC20("Token", "TKN") Ownable(msg.sender) {
        require(_governanceTokenAddress != address(0), "Invalid governance token address");
        governanceToken = GovernanceToken(_governanceTokenAddress);
    }

    /**
     * @dev Mint tokens to a whitelisted address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(governanceToken.isWhitelisted(to), "Recipient not whitelisted");
        _mint(to, amount);
    }

    /**
     * @dev Override transfer to check whitelist status
     * @param to The address to transfer to
     * @param value The amount to transfer
     */
    function transfer(address to, uint256 value) public override returns (bool) {
        require(governanceToken.isWhitelisted(msg.sender), "Sender not whitelisted");
        require(governanceToken.isWhitelisted(to), "Recipient not whitelisted");
        return super.transfer(to, value);
    }

    /**
     * @dev Override transferFrom to check whitelist status
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param value The amount to transfer
     */
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        require(governanceToken.isWhitelisted(from), "Sender not whitelisted");
        require(governanceToken.isWhitelisted(to), "Recipient not whitelisted");
        return super.transferFrom(from, to, value);
    }
}
