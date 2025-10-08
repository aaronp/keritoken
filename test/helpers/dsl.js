const { ethers } = require("hardhat");

/**
 * Deploy a GovernanceToken contract
 * @param {Signer} deployer - Optional deployer signer (defaults to first signer)
 * @returns {Promise<Contract>} Deployed GovernanceToken contract
 */
async function deployGovernance(deployer = null) {
  if (!deployer) {
    [deployer] = await ethers.getSigners();
  }

  const GovernanceToken = await ethers.getContractFactory("GovernanceToken", deployer);
  const governance = await GovernanceToken.deploy();
  await governance.waitForDeployment();

  return governance;
}

/**
 * Deploy a Token contract
 * @param {string|Contract} governanceAddress - GovernanceToken address or contract
 * @param {Signer} deployer - Optional deployer signer (defaults to first signer)
 * @returns {Promise<Contract>} Deployed Token contract
 */
async function deployToken(governanceAddress, deployer = null) {
  if (!deployer) {
    [deployer] = await ethers.getSigners();
  }

  // Handle both address string and contract object
  const govAddress = typeof governanceAddress === 'string'
    ? governanceAddress
    : await governanceAddress.getAddress();

  const Token = await ethers.getContractFactory("Token", deployer);
  const token = await Token.deploy(govAddress);
  await token.waitForDeployment();

  return token;
}

/**
 * Add an address to the governance whitelist
 * @param {Contract} governance - GovernanceToken contract
 * @param {string} address - Address to whitelist
 * @param {string} referenceId - Reference string for auditing (default: "test-ref")
 * @returns {Promise<TransactionReceipt>} Transaction receipt
 */
async function whitelistAddress(governance, address, referenceId = "test-ref") {
  const tx = await governance.addAddress(address, referenceId);
  return await tx.wait();
}

/**
 * Remove an address from the governance whitelist
 * @param {Contract} governance - GovernanceToken contract
 * @param {string} address - Address to remove
 * @param {string} referenceId - Reference string for auditing (default: "removed")
 * @returns {Promise<TransactionReceipt>} Transaction receipt
 */
async function removeAddress(governance, address, referenceId = "removed") {
  const tx = await governance.removeAddress(address, referenceId);
  return await tx.wait();
}

/**
 * Mint tokens to an address
 * @param {Contract} token - Token contract
 * @param {string} to - Recipient address
 * @param {string|BigInt} amount - Amount to mint (in ether units, e.g., "100")
 * @returns {Promise<TransactionReceipt>} Transaction receipt
 */
async function mintTokens(token, to, amount) {
  const amountWei = typeof amount === 'string'
    ? ethers.parseEther(amount)
    : amount;

  const tx = await token.mint(to, amountWei);
  return await tx.wait();
}

/**
 * Transfer tokens between addresses
 * @param {Contract} token - Token contract
 * @param {Signer} from - Sender signer
 * @param {string} to - Recipient address
 * @param {string|BigInt} amount - Amount to transfer (in ether units, e.g., "100")
 * @returns {Promise<TransactionReceipt>} Transaction receipt
 */
async function transferTokens(token, from, to, amount) {
  const amountWei = typeof amount === 'string'
    ? ethers.parseEther(amount)
    : amount;

  const tx = await token.connect(from).transfer(to, amountWei);
  return await tx.wait();
}

/**
 * Check if an address is whitelisted
 * @param {Contract} governance - GovernanceToken contract
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} True if whitelisted
 */
async function isWhitelisted(governance, address) {
  return await governance.isWhitelisted(address);
}

/**
 * Get token balance for an address
 * @param {Contract} token - Token contract
 * @param {string} address - Address to check
 * @param {boolean} formatted - Return as formatted ether string (default: true)
 * @returns {Promise<string|BigInt>} Balance
 */
async function getBalance(token, address, formatted = true) {
  const balance = await token.balanceOf(address);
  return formatted ? ethers.formatEther(balance) : balance;
}

/**
 * Setup a complete test scenario with governance and token
 * @param {Array<Signer>} signers - Optional array of signers to use
 * @returns {Promise<Object>} Object containing governance, token, and signers
 */
async function setupScenario(signers = null) {
  if (!signers) {
    signers = await ethers.getSigners();
  }

  const [owner, ...users] = signers;
  const governance = await deployGovernance(owner);
  const token = await deployToken(governance, owner);

  return {
    governance,
    token,
    owner,
    users,
    // Convenience accessors
    user1: users[0],
    user2: users[1],
    user3: users[2],
  };
}

module.exports = {
  deployGovernance,
  deployToken,
  whitelistAddress,
  removeAddress,
  mintTokens,
  transferTokens,
  isWhitelisted,
  getBalance,
  setupScenario,
};
