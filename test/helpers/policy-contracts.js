const { ethers } = require('hardhat');

class PolicyRegistryContract {
  constructor(contract, owner) {
    this.contract = contract;
    this.owner = owner;
  }

  static async deploy() {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('PolicyRegistry');
    const contract = await Factory.deploy();
    return new PolicyRegistryContract(contract, owner);
  }

  async grantUpdater(address) {
    const role = await this.contract.UPDATER_ROLE();
    return this.contract.grantRole(role, address);
  }

  async setAllowed(policyLabel, account, allowed, signer) {
    const c = signer ? this.contract.connect(signer) : this.contract;
    return c.setAllowed(policyLabel, account, allowed);
  }

  async setAllowedBatch(policyLabel, accounts, allowed, signer) {
    const c = signer ? this.contract.connect(signer) : this.contract;
    return c.setAllowedBatch(policyLabel, accounts, allowed);
  }

  async isAllowed(policyLabel, account) {
    const policyId = ethers.keccak256(ethers.toUtf8Bytes(policyLabel));
    return this.contract.isAllowed(policyId, account);
  }
}

module.exports = { PolicyRegistryContract };
