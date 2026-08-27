// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPolicyRegistry.sol";

contract PolicyRegistry is IPolicyRegistry, AccessControl {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    mapping(bytes32 => mapping(address => bool)) private _eligibility;

    event EligibilityUpdated(bytes32 indexed policyId, address indexed account, bool allowed);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function isAllowed(bytes32 policyId, address account) external view override returns (bool) {
        return _eligibility[policyId][account];
    }

    function setAllowed(bytes32 policyId, address account, bool allowed) external onlyRole(UPDATER_ROLE) {
        _eligibility[policyId][account] = allowed;
        emit EligibilityUpdated(policyId, account, allowed);
    }

    function setAllowedBatch(
        bytes32 policyId,
        address[] calldata accounts,
        bool[] calldata allowed
    ) external onlyRole(UPDATER_ROLE) {
        require(accounts.length == allowed.length, "Length mismatch");
        for (uint256 i = 0; i < accounts.length; i++) {
            _eligibility[policyId][accounts[i]] = allowed[i];
            emit EligibilityUpdated(policyId, accounts[i], allowed[i]);
        }
    }
}
