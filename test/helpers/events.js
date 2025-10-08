const { ethers } = require("hardhat");

/**
 * Get all AddressAdded events from a GovernanceToken contract
 * @param {Contract} governance - GovernanceToken contract
 * @param {Object} filter - Optional filter {address, fromBlock, toBlock}
 * @returns {Promise<Array>} Array of event objects {walletAddress, referenceId, blockNumber}
 */
async function getAddressAddedEvents(governance, filter = {}) {
  const eventFilter = governance.filters.AddressAdded(filter.address || null);
  const events = await governance.queryFilter(
    eventFilter,
    filter.fromBlock || 0,
    filter.toBlock || 'latest'
  );

  return events.map(event => ({
    walletAddress: event.args.walletAddress,
    referenceId: event.args.referenceId,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
  }));
}

/**
 * Get all AddressRemoved events from a GovernanceToken contract
 * @param {Contract} governance - GovernanceToken contract
 * @param {Object} filter - Optional filter {address, fromBlock, toBlock}
 * @returns {Promise<Array>} Array of event objects {walletAddress, referenceId, blockNumber}
 */
async function getAddressRemovedEvents(governance, filter = {}) {
  const eventFilter = governance.filters.AddressRemoved(filter.address || null);
  const events = await governance.queryFilter(
    eventFilter,
    filter.fromBlock || 0,
    filter.toBlock || 'latest'
  );

  return events.map(event => ({
    walletAddress: event.args.walletAddress,
    referenceId: event.args.referenceId,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
  }));
}

/**
 * Get current whitelist by reading events (added - removed)
 * @param {Contract} governance - GovernanceToken contract
 * @returns {Promise<Array>} Array of currently whitelisted addresses with their reference IDs
 */
async function getCurrentWhitelist(governance) {
  const added = await getAddressAddedEvents(governance);
  const removed = await getAddressRemovedEvents(governance);

  // Build a map of addresses to their most recent reference
  const addressMap = new Map();

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
 * Get Transfer events from a Token contract
 * @param {Contract} token - Token contract
 * @param {Object} filter - Optional filter {from, to, fromBlock, toBlock}
 * @returns {Promise<Array>} Array of transfer event objects
 */
async function getTransferEvents(token, filter = {}) {
  const eventFilter = token.filters.Transfer(
    filter.from || null,
    filter.to || null
  );
  const events = await token.queryFilter(
    eventFilter,
    filter.fromBlock || 0,
    filter.toBlock || 'latest'
  );

  return events.map(event => ({
    from: event.args.from,
    to: event.args.to,
    value: event.args.value,
    valueFormatted: ethers.formatEther(event.args.value),
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
  }));
}

/**
 * Get all token holders by reading Transfer events
 * @param {Contract} token - Token contract
 * @returns {Promise<Array>} Array of holder addresses with balances
 */
async function getTokenHolders(token) {
  const transfers = await getTransferEvents(token);
  const balances = new Map();

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
 * Get audit trail for a specific address
 * @param {Contract} governance - GovernanceToken contract
 * @param {string} address - Address to audit
 * @returns {Promise<Object>} Audit trail with all events for this address
 */
async function getAuditTrail(governance, address) {
  const added = await getAddressAddedEvents(governance, { address });
  const removed = await getAddressRemovedEvents(governance, { address });

  // Combine and sort by block number
  const allEvents = [
    ...added.map(e => ({ ...e, type: 'ADDED' })),
    ...removed.map(e => ({ ...e, type: 'REMOVED' })),
  ].sort((a, b) => a.blockNumber - b.blockNumber);

  const isCurrentlyWhitelisted = await governance.isWhitelisted(address);

  return {
    address,
    isCurrentlyWhitelisted,
    events: allEvents,
    addCount: added.length,
    removeCount: removed.length,
  };
}

module.exports = {
  getAddressAddedEvents,
  getAddressRemovedEvents,
  getCurrentWhitelist,
  getTransferEvents,
  getTokenHolders,
  getAuditTrail,
};
