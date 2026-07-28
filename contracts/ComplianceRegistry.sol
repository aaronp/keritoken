// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ComplianceRegistry is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public bridgeSigner;
    bytes32 public policySAID;
    mapping(bytes32 => bool) public usedDecisionIds;

    event WalletVerified(
        address indexed wallet,
        bytes32 indexed policySAID,
        bytes32 decisionId,
        uint64 expiry
    );
    event SignerRotated(address indexed oldSigner, address indexed newSigner);

    error InvalidSigner();
    error PolicyMismatch();
    error RegistryMismatch();
    error ChainIdMismatch();
    error Expired();
    error DecisionIdUsed();
    error ZeroAddress();

    error ZeroPolicySAID();

    constructor(
        address bridgeSigner_,
        bytes32 policySAID_
    ) Ownable(msg.sender) {
        if (bridgeSigner_ == address(0)) revert ZeroAddress();
        if (policySAID_ == bytes32(0)) revert ZeroPolicySAID();
        bridgeSigner = bridgeSigner_;
        policySAID = policySAID_;
    }

    function verify(
        bytes32 policySAID_,
        address wallet,
        uint64 expiry,
        bytes32 decisionId,
        uint256 chainId_,
        address registry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool) {
        bytes32 digest = keccak256(
            abi.encodePacked(policySAID_, wallet, expiry, decisionId, chainId_, registry)
        );
        bytes32 ethSignedHash = digest.toEthSignedMessageHash();
        address recovered = ECDSA.recover(ethSignedHash, v, r, s);

        if (recovered != bridgeSigner) revert InvalidSigner();
        if (wallet == address(0)) revert ZeroAddress();
        if (policySAID_ != policySAID) revert PolicyMismatch();
        if (registry != address(this)) revert RegistryMismatch();
        if (chainId_ != block.chainid) revert ChainIdMismatch();
        if (expiry <= block.timestamp) revert Expired();
        if (usedDecisionIds[decisionId]) revert DecisionIdUsed();

        usedDecisionIds[decisionId] = true;
        emit WalletVerified(wallet, policySAID_, decisionId, expiry);
        return true;
    }

    function rotateSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address old = bridgeSigner;
        bridgeSigner = newSigner;
        emit SignerRotated(old, newSigner);
    }
}
