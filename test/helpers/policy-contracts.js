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

  async setAllowed(policyId, account, allowed, signer) {
    const c = signer ? this.contract.connect(signer) : this.contract;
    return c.setAllowed(policyId, account, allowed);
  }

  async setAllowedBatch(policyId, accounts, allowed, signer) {
    const c = signer ? this.contract.connect(signer) : this.contract;
    return c.setAllowedBatch(policyId, accounts, allowed);
  }

  async isAllowed(policyId, account) {
    return this.contract.isAllowed(policyId, account);
  }
}

module.exports = { PolicyRegistryContract };
