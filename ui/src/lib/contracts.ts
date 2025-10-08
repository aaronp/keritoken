import { ethers, BrowserProvider, Signer, Contract } from 'ethers';
import GovernanceTokenArtifact from '../../public/contracts/GovernanceToken.json';
import TokenArtifact from '../../public/contracts/Token.json';

/**
 * Error messages from contracts
 */
export const ERRORS = {
  RECIPIENT_NOT_WHITELISTED: "Recipient not whitelisted",
  SENDER_NOT_WHITELISTED: "Sender not whitelisted",
  ALREADY_WHITELISTED: "Address already whitelisted",
  NOT_WHITELISTED: "Address not whitelisted",
  ZERO_ADDRESS: "Cannot whitelist zero address",
  INVALID_GOVERNANCE: "Invalid governance token address",
  UNAUTHORIZED: "OwnableUnauthorizedAccount",
};

/**
 * Event interfaces
 */
export interface AddressAddedEvent {
  walletAddress: string;
  referenceId: string;
  blockNumber: number;
  transactionHash: string;
}

export interface AddressRemovedEvent {
  walletAddress: string;
  referenceId: string;
  blockNumber: number;
  transactionHash: string;
}

export interface TransferEvent {
  from: string;
  to: string;
  value: bigint;
  valueFormatted: string;
  blockNumber: number;
  transactionHash: string;
}

export interface WhitelistEntry {
  address: string;
  referenceId: string;
  addedBlock: number;
}

export interface TokenHolder {
  address: string;
  balance: bigint;
  balanceFormatted: string;
}

export interface AuditTrail {
  address: string;
  isCurrentlyWhitelisted: boolean;
  events: Array<{
    type: 'ADDED' | 'REMOVED';
    walletAddress: string;
    referenceId: string;
    blockNumber: number;
    transactionHash: string;
  }>;
  addCount: number;
  removeCount: number;
}

/**
 * GovernanceContract wrapper class
 * Provides high-level methods for interacting with GovernanceToken
 */
export class GovernanceContract {
  private contract: Contract;
  public address: string | null = null;

  constructor(addressOrContract: string | Contract, providerOrSigner: BrowserProvider | Signer) {
    if (typeof addressOrContract === 'string') {
      this.contract = new ethers.Contract(
        addressOrContract,
        GovernanceTokenArtifact.abi,
        providerOrSigner
      );
    } else {
      this.contract = addressOrContract;
    }
  }

  async getAddress(): Promise<string> {
    if (!this.address) {
      this.address = await this.contract.getAddress();
    }
    return this.address;
  }

  /**
   * Whitelist an address
   */
  async whitelist(address: string, referenceId: string = "default-ref"): Promise<ethers.ContractTransactionReceipt> {
    const tx = await this.contract.addAddress(address, referenceId);
    return await tx.wait();
  }

  /**
   * Remove an address from whitelist
   */
  async remove(address: string, referenceId: string = "removed"): Promise<ethers.ContractTransactionReceipt> {
    const tx = await this.contract.removeAddress(address, referenceId);
    return await tx.wait();
  }

  /**
   * Check if address is whitelisted
   */
  async isWhitelisted(address: string): Promise<boolean> {
    return await this.contract.isWhitelisted(address);
  }

  /**
   * Get all AddressAdded events
   */
  async getAddedEvents(filter: { address?: string; fromBlock?: number; toBlock?: number | string } = {}): Promise<AddressAddedEvent[]> {
    const eventFilter = this.contract.filters.AddressAdded(filter.address || null);
    const events = await this.contract.queryFilter(
      eventFilter,
      filter.fromBlock || 0,
      filter.toBlock || 'latest'
    );

    return events.map((event: any) => ({
      walletAddress: event.args.walletAddress,
      referenceId: event.args.referenceId,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    }));
  }

  /**
   * Get all AddressRemoved events
   */
  async getRemovedEvents(filter: { address?: string; fromBlock?: number; toBlock?: number | string } = {}): Promise<AddressRemovedEvent[]> {
    const eventFilter = this.contract.filters.AddressRemoved(filter.address || null);
    const events = await this.contract.queryFilter(
      eventFilter,
      filter.fromBlock || 0,
      filter.toBlock || 'latest'
    );

    return events.map((event: any) => ({
      walletAddress: event.args.walletAddress,
      referenceId: event.args.referenceId,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    }));
  }

  /**
   * Get current whitelist from events
   */
  async getWhitelist(): Promise<WhitelistEntry[]> {
    const added = await this.getAddedEvents();
    const removed = await this.getRemovedEvents();

    const addressMap = new Map<string, WhitelistEntry>();

    // Add all added addresses
    for (const event of added) {
      addressMap.set(event.walletAddress.toLowerCase(), {
        address: event.walletAddress,
        referenceId: event.referenceId,
        addedBlock: event.blockNumber,
      });
    }

    // Remove all removed addresses
    for (const event of removed) {
      addressMap.delete(event.walletAddress.toLowerCase());
    }

    return Array.from(addressMap.values());
  }

  /**
   * Get audit trail for an address
   */
  async getAuditTrail(address: string): Promise<AuditTrail> {
    const added = await this.getAddedEvents({ address });
    const removed = await this.getRemovedEvents({ address });

    const allEvents = [
      ...added.map(e => ({ ...e, type: 'ADDED' as const })),
      ...removed.map(e => ({ ...e, type: 'REMOVED' as const })),
    ].sort((a, b) => a.blockNumber - b.blockNumber);

    const isCurrentlyWhitelisted = await this.isWhitelisted(address);

    return {
      address,
      isCurrentlyWhitelisted,
      events: allEvents,
      addCount: added.length,
      removeCount: removed.length,
    };
  }

  /**
   * Deploy a new GovernanceToken contract
   */
  static async deploy(signer: Signer): Promise<GovernanceContract> {
    const factory = new ethers.ContractFactory(
      GovernanceTokenArtifact.abi,
      GovernanceTokenArtifact.bytecode,
      signer
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    return new GovernanceContract(contract, signer);
  }
}

/**
 * TokenContract wrapper class
 * Provides high-level methods for interacting with Token
 */
export class TokenContract {
  private contract: Contract;
  public address: string | null = null;

  constructor(addressOrContract: string | Contract, providerOrSigner: BrowserProvider | Signer) {
    if (typeof addressOrContract === 'string') {
      this.contract = new ethers.Contract(
        addressOrContract,
        TokenArtifact.abi,
        providerOrSigner
      );
    } else {
      this.contract = addressOrContract;
    }
  }

  async getAddress(): Promise<string> {
    if (!this.address) {
      this.address = await this.contract.getAddress();
    }
    return this.address;
  }

  /**
   * Mint tokens to an address
   */
  async mint(to: string, amount: string | bigint): Promise<ethers.ContractTransactionReceipt> {
    const amountWei = typeof amount === 'string' ? ethers.parseEther(amount) : amount;
    const tx = await this.contract.mint(to, amountWei);
    return await tx.wait();
  }

  /**
   * Transfer tokens (requires signer)
   */
  async transfer(from: Signer, to: string, amount: string | bigint): Promise<ethers.ContractTransactionReceipt> {
    const amountWei = typeof amount === 'string' ? ethers.parseEther(amount) : amount;
    const tx = await this.contract.connect(from).transfer(to, amountWei);
    return await tx.wait();
  }

  /**
   * Get balance of an address
   */
  async balanceOf(address: string, formatted: boolean = true): Promise<string | bigint> {
    const balance = await this.contract.balanceOf(address);
    return formatted ? ethers.formatEther(balance) : balance;
  }

  /**
   * Get total supply
   */
  async totalSupply(formatted: boolean = true): Promise<string | bigint> {
    const supply = await this.contract.totalSupply();
    return formatted ? ethers.formatEther(supply) : supply;
  }

  /**
   * Get all transfer events
   */
  async getTransfers(filter: { from?: string; to?: string; fromBlock?: number; toBlock?: number | string } = {}): Promise<TransferEvent[]> {
    const eventFilter = this.contract.filters.Transfer(
      filter.from || null,
      filter.to || null
    );
    const events = await this.contract.queryFilter(
      eventFilter,
      filter.fromBlock || 0,
      filter.toBlock || 'latest'
    );

    return events.map((event: any) => ({
      from: event.args.from,
      to: event.args.to,
      value: event.args.value,
      valueFormatted: ethers.formatEther(event.args.value),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    }));
  }

  /**
   * Get all token holders from events
   */
  async getHolders(): Promise<TokenHolder[]> {
    const transfers = await this.getTransfers();
    const balances = new Map<string, bigint>();

    for (const transfer of transfers) {
      // Skip mints from zero address
      if (transfer.from !== ethers.ZeroAddress) {
        const fromBalance = balances.get(transfer.from) || 0n;
        balances.set(transfer.from, fromBalance - transfer.value);
      }

      // Add to recipient
      const toBalance = balances.get(transfer.to) || 0n;
      balances.set(transfer.to, toBalance + transfer.value);
    }

    // Filter out zero balances and format
    return Array.from(balances.entries())
      .filter(([_, balance]) => balance > 0n)
      .map(([address, balance]) => ({
        address,
        balance,
        balanceFormatted: ethers.formatEther(balance),
      }));
  }

  /**
   * Get governance token address
   */
  async getGovernanceAddress(): Promise<string> {
    return await this.contract.governanceToken();
  }

  /**
   * Deploy a new Token contract
   */
  static async deploy(governanceAddress: string, signer: Signer): Promise<TokenContract> {
    const factory = new ethers.ContractFactory(
      TokenArtifact.abi,
      TokenArtifact.bytecode,
      signer
    );

    const contract = await factory.deploy(governanceAddress);
    await contract.waitForDeployment();

    return new TokenContract(contract, signer);
  }
}
