const { expect } = require('chai');
const { ethers } = require('hardhat');
const { PolicyRegistryContract } = require('./helpers/policy-contracts');

describe('PolicyRegistry', function () {
  const POLICY_A = ethers.keccak256(ethers.toUtf8Bytes('policy-a-said'));
  const POLICY_B = ethers.keccak256(ethers.toUtf8Bytes('policy-b-said'));
  let registry, owner, updater, alice, bob;

  beforeEach(async function () {
    [owner, updater, alice, bob] = await ethers.getSigners();
    registry = await PolicyRegistryContract.deploy();
    await registry.grantUpdater(updater.address);
  });

  describe('Access control', function () {
    it('deployer has admin role', async function () {
      const adminRole = await registry.contract.DEFAULT_ADMIN_ROLE();
      expect(await registry.contract.hasRole(adminRole, owner.address)).to.be.true;
    });

    it('rejects setAllowed from non-updater', async function () {
      await expect(
        registry.setAllowed(POLICY_A, alice.address, true, alice)
      ).to.be.reverted;
    });

    it('rejects setAllowedBatch from non-updater', async function () {
      await expect(
        registry.setAllowedBatch(POLICY_A, [alice.address], [true], alice)
      ).to.be.reverted;
    });
  });

  describe('setAllowed', function () {
    it('sets eligibility and emits event', async function () {
      await expect(registry.setAllowed(POLICY_A, alice.address, true, updater))
        .to.emit(registry.contract, 'EligibilityUpdated')
        .withArgs(POLICY_A, alice.address, true);
      expect(await registry.isAllowed(POLICY_A, alice.address)).to.be.true;
    });

    it('is idempotent — setting same value does not revert', async function () {
      await registry.setAllowed(POLICY_A, alice.address, true, updater);
      await expect(registry.setAllowed(POLICY_A, alice.address, true, updater))
        .to.emit(registry.contract, 'EligibilityUpdated');
    });

    it('can revoke eligibility', async function () {
      await registry.setAllowed(POLICY_A, alice.address, true, updater);
      await registry.setAllowed(POLICY_A, alice.address, false, updater);
      expect(await registry.isAllowed(POLICY_A, alice.address)).to.be.false;
    });
  });

  describe('setAllowedBatch', function () {
    it('sets multiple accounts', async function () {
      await registry.setAllowedBatch(
        POLICY_A, [alice.address, bob.address], [true, false], updater
      );
      expect(await registry.isAllowed(POLICY_A, alice.address)).to.be.true;
      expect(await registry.isAllowed(POLICY_A, bob.address)).to.be.false;
    });

    it('reverts on length mismatch', async function () {
      await expect(
        registry.setAllowedBatch(POLICY_A, [alice.address], [true, false], updater)
      ).to.be.revertedWith('Length mismatch');
    });
  });

  describe('Multi-policy isolation', function () {
    it('policies are independent', async function () {
      await registry.setAllowed(POLICY_A, alice.address, true, updater);
      expect(await registry.isAllowed(POLICY_A, alice.address)).to.be.true;
      expect(await registry.isAllowed(POLICY_B, alice.address)).to.be.false;
    });
  });

  describe('isAllowed', function () {
    it('returns false for unknown accounts', async function () {
      expect(await registry.isAllowed(POLICY_A, alice.address)).to.be.false;
    });
  });
});
