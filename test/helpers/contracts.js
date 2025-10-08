const { ethers } = require("hardhat");
const events = require("./events");

/**
 * Wrapper class for GovernanceToken contract
 * Provides high-level methods for testing
 */
class GovernanceContract {
  constructor(contract) {
    this.contract = contract;
    this.address = null; // Will be set lazily
  }

  async getAddress() {
    if (!this.address) {
      this.address = await this.contract.getAddress();
    }
    return this.address;
  }

  /**
   * Whitelist an address
   */
  async whitelist(address, referenceId = "test-ref") {
    const tx = await this.contract.addAddress(address, referenceId);
    return await tx.wait();
  }

  /**
   * Remove an address from whitelist
   */
  async remove(address, referenceId = "removed") {
    const tx = await this.contract.removeAddress(address, referenceId);
    return await tx.wait();
  }

  /**
   * Check if address is whitelisted
   */
  async isWhitelisted(address) {
    return await this.contract.isWhitelisted(address);
  }

  /**
   * Get all whitelisted addresses from events
   */
  async getWhitelist() {
    return await events.getCurrentWhitelist(this.contract);
  }

  /**
   * Get audit trail for an address
   */
  async getAuditTrail(address) {
    return await events.getAuditTrail(this.contract, address);
  }

  /**
   * Get all added events
   */
  async getAddedEvents(filter = {}) {
    return await events.getAddressAddedEvents(this.contract, filter);
  }

  /**
   * Get all removed events
   */
  async getRemovedEvents(filter = {}) {
    return await events.getAddressRemovedEvents(this.contract, filter);
  }
}

/**
 * Wrapper class for Token contract
 * Provides high-level methods for testing
 */
class TokenContract {
  constructor(contract) {
    this.contract = contract;
    this.address = null; // Will be set lazily
  }

  async getAddress() {
    if (!this.address) {
      this.address = await this.contract.getAddress();
    }
    return this.address;
  }

  /**
   * Mint tokens to an address
   */
  async mint(to, amount) {
    const amountWei = typeof amount === 'string'
      ? ethers.parseEther(amount)
      : amount;

    const tx = await this.contract.mint(to, amountWei);
    return await tx.wait();
  }

  /**
   * Transfer tokens
   */
  async transfer(from, to, amount) {
    const amountWei = typeof amount === 'string'
      ? ethers.parseEther(amount)
      : amount;

    const tx = await this.contract.connect(from).transfer(to, amountWei);
    return await tx.wait();
  }

  /**
   * Get balance of an address
   */
  async balanceOf(address, formatted = true) {
    const balance = await this.contract.balanceOf(address);
    return formatted ? ethers.formatEther(balance) : balance;
  }

  /**
   * Get total supply
   */
  async totalSupply(formatted = true) {
    const supply = await this.contract.totalSupply();
    return formatted ? ethers.formatEther(supply) : supply;
  }

  /**
   * Get all token holders from events
   */
  async getHolders() {
    return await events.getTokenHolders(this.contract);
  }

  /**
   * Get all transfer events
   */
  async getTransfers(filter = {}) {
    return await events.getTransferEvents(this.contract, filter);
  }

  /**
   * Get governance token address
   */
  async getGovernanceAddress() {
    return await this.contract.governanceToken();
  }
}

module.exports = {
  GovernanceContract,
  TokenContract,
};
