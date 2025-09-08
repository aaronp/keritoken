# On-Chain Auction Launch Plan for Bond on Base

This document outlines the step-by-step process for launching an on-chain auction for a bond on Base (Coinbase's L2 network).

## Prerequisites

- [X] Base network access (testnet or mainnet)
- [X] ETH for gas fees on Base
- [X] Development environment setup (Hardhat/Foundry)
- [X] Base RPC endpoint
- [X] Wallet with deployment permissions

## Phase 1: Smart Contract Development & Testing

### 1.1 Contract Development
- [ ] Implement ERC20 bond token contract with minting capabilities
- [ ] Implement auction contract with encrypted bidding mechanism
- [ ] Add issuer public key storage for bid encryption
- [ ] Implement encrypted bid submission with commitment hash
- [ ] Create off-chain encryption/decryption utilities
- [ ] Implement stablecoin interface (or use existing USDC on Base)
- [ ] Add access control for minter role management
- [ ] Implement pro-rata allocation logic for margin bids

### 1.2 Local Testing
- [ ] Write comprehensive unit tests for all contracts
- [ ] Test encrypted bid submission and storage
- [ ] Test commitment hash verification during reveal
- [ ] Test issuer's ability to decrypt bids off-chain
- [ ] Verify bid privacy from other participants
- [ ] Test bid sorting and clearing price calculation
- [ ] Test pro-rata allocation at margin
- [ ] Test claim mechanism and token transfers
- [ ] Test edge cases (no bids, all bids below minimum, invalid encryption, etc.)

## Phase 2: Testnet Deployment

### 2.1 Base Goerli/Sepolia Deployment
- [ ] Deploy bond token contract
- [ ] Deploy auction contract
- [ ] Deploy or identify test stablecoin contract
- [ ] Verify contracts on BaseScan testnet

### 2.2 Testnet Configuration
- [ ] Grant MINTER role to auction contract (with appropriate cap)
- [ ] Set auction parameters:
  - Bond supply amount
  - Minimum price
  - Maximum price
  - Commit phase duration
  - Reveal phase duration
  - Settlement window

### 2.3 Testnet Auction Simulation
- [ ] Generate and distribute issuer RSA key pair
- [ ] Run test auction with multiple participants
- [ ] Test encrypted bid submissions in commit phase
- [ ] Verify issuer can decrypt and monitor bids in real-time
- [ ] Test reveal phase and commitment validation
- [ ] Ensure other participants cannot see bid details
- [ ] Test finalization and clearing price calculation
- [ ] Test claim process and token distribution
- [ ] Monitor gas costs and optimize if needed

## Phase 3: Security & Auditing

### 3.1 Security Review
- [ ] Internal code review
- [ ] Review encryption implementation and key management
- [ ] Verify bid privacy and prevent information leakage
- [ ] Test resistance to front-running attacks
- [ ] Run automated security tools (Slither, Mythril)
- [ ] Consider professional audit for production deployment
- [ ] Implement emergency pause mechanism if needed

### 3.2 Access Control Review
- [ ] Verify role-based permissions are correctly set
- [ ] Ensure auction contract can only mint up to authorized cap
- [ ] Review owner/admin functions and consider timelock

## Phase 4: Mainnet Preparation

### 4.1 Deployment Preparation
- [ ] Finalize all contract parameters
- [ ] Prepare deployment scripts with safety checks
- [ ] Document all configuration values
- [ ] Set up monitoring infrastructure

### 4.2 Legal & Compliance
- [ ] Ensure compliance with securities regulations
- [ ] Prepare participant terms and conditions
- [ ] Set up KYC/AML processes if required
- [ ] Document auction rules and procedures

## Phase 5: Mainnet Deployment

### 5.1 Contract Deployment
- [ ] Deploy bond token contract to Base mainnet
- [ ] Deploy auction contract to Base mainnet
- [ ] Verify contracts on BaseScan
- [ ] Transfer ownership to multisig if applicable

### 5.2 Initial Configuration
- [ ] Grant MINTER role to auction contract with exact bond supply cap
- [ ] Configure auction parameters (double-check all values)
- [ ] Set auction start time with appropriate notice period

## Phase 6: Auction Execution

### 6.1 Pre-Auction
- [ ] Announce auction to potential participants
- [ ] Publish issuer's public key for bid encryption
- [ ] Provide encryption utilities and documentation
- [ ] Share participation guides with encryption examples
- [ ] Set up issuer monitoring system for decrypting bids
- [ ] Set up support channels for participants
- [ ] Monitor contract state and readiness

### 6.2 Commit Phase
- [ ] Monitor encrypted bid submissions
- [ ] Decrypt and analyze incoming bids (issuer only)
- [ ] Track participation rates and bid values
- [ ] Ensure bid encryption is working correctly
- [ ] Track gas prices on Base
- [ ] Provide support to participants
- [ ] Ensure no technical issues

### 6.3 Reveal Phase
- [ ] Notify participants to reveal bids
- [ ] Monitor reveal progress
- [ ] Track any failed reveals
- [ ] Prepare for finalization

### 6.4 Finalization & Settlement
- [ ] Call finalize() function after reveal phase ends
- [ ] Verify clearing price calculation
- [ ] Review allocation results
- [ ] Notify winners of their allocations

### 6.5 Claim Period
- [ ] Monitor claim transactions
- [ ] Assist participants with claiming process
- [ ] Track unclaimed allocations
- [ ] Consider deadline for unclaimed tokens

## Phase 7: Post-Auction

### 7.1 Reporting
- [ ] Generate auction results report
- [ ] Document final clearing price
- [ ] List all successful allocations
- [ ] Calculate total proceeds

### 7.2 Token Distribution
- [ ] Verify all claimed tokens match allocations
- [ ] Handle any unclaimed tokens per policy
- [ ] Transfer proceeds to issuer
- [ ] Archive auction data

### 7.3 Lessons Learned
- [ ] Document any issues encountered
- [ ] Gather participant feedback
- [ ] Identify improvements for future auctions
- [ ] Update documentation and processes

## Key Considerations

1. **Gas Optimization**: Base has lower fees than Ethereum mainnet, but still optimize for large number of participants
2. **Encryption**: Ensure proper key management and secure storage of issuer's private key
3. **Privacy**: Verify that bid details remain private from other participants during auction
4. **Timing**: Consider time zones when setting auction phases
5. **Communication**: Clear documentation on encryption process is crucial for participation
6. **Backup Plans**: Have procedures for technical issues, failed transactions, or encryption problems
7. **Regulatory**: Ensure all legal requirements are met before launch

## Emergency Procedures

- Contract pause mechanism (if implemented)
- Multisig intervention procedures
- Communication channels for urgent updates
- Rollback procedures if critical issues found

## Success Metrics

- Number of unique participants
- Total bids submitted vs revealed
- Gas costs per participant
- Time to full claim completion
- Participant satisfaction feedback