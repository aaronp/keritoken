# On-Chain Auction Launch Plan for Bond on Base

This document outlines the step-by-step process for launching an on-chain auction for a bond on Base (Coinbase's L2 network).

## Prerequisites

- [X] Base network access (testnet or mainnet)
- [X] ETH for gas fees on Base
- [X] Development environment setup (Hardhat/Foundry)
- [ ] Base RPC endpoint
- [ ] Wallet with deployment permissions

## Phase 1: Smart Contract Development & Testing

### 1.1 Contract Development
- [ ] Implement ERC20 bond token contract with minting capabilities
- [ ] Implement auction contract with commit-reveal mechanism
- [ ] Implement stablecoin interface (or use existing USDC on Base)
- [ ] Add access control for minter role management
- [ ] Implement pro-rata allocation logic for margin bids

### 1.2 Local Testing
- [ ] Write comprehensive unit tests for all contracts
- [ ] Test commit-reveal mechanism
- [ ] Test bid sorting and clearing price calculation
- [ ] Test pro-rata allocation at margin
- [ ] Test claim mechanism and token transfers
- [ ] Test edge cases (no bids, all bids below minimum, etc.)

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
- [ ] Run test auction with multiple participants
- [ ] Test commit phase with various bid submissions
- [ ] Test reveal phase and bid validation
- [ ] Test finalization and clearing price calculation
- [ ] Test claim process and token distribution
- [ ] Monitor gas costs and optimize if needed

## Phase 3: Security & Auditing

### 3.1 Security Review
- [ ] Internal code review
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
- [ ] Provide documentation and participation guides
- [ ] Set up support channels for participants
- [ ] Monitor contract state and readiness

### 6.2 Commit Phase
- [ ] Monitor bid submissions
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
2. **Timing**: Consider time zones when setting auction phases
3. **Communication**: Clear documentation and support are crucial for participation
4. **Backup Plans**: Have procedures for technical issues or failed transactions
5. **Regulatory**: Ensure all legal requirements are met before launch

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