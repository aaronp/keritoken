// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPolicyRegistry.sol";

contract ERC20Plus is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IPolicyRegistry public immutable policyRegistry;
    bytes32 public immutable policyId;

    constructor(
        string memory name_,
        string memory symbol_,
        address policyRegistry_,
        string memory policyLabel_
    ) ERC20(name_, symbol_) {
        require(policyRegistry_ != address(0), "Zero registry address");
        policyRegistry = IPolicyRegistry(policyRegistry_);
        policyId = keccak256(bytes(policyLabel_));
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (to != address(0)) {
            require(policyRegistry.isAllowed(policyId, to), "Recipient not eligible");
        }
        if (from != address(0) && to != address(0)) {
            require(policyRegistry.isAllowed(policyId, from), "Sender not eligible");
        }
        super._update(from, to, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
