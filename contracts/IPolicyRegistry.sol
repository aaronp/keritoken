// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPolicyRegistry {
    function isAllowed(bytes32 policyId, address account) external view returns (bool);
}
