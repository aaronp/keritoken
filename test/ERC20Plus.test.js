const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ERC20Plus', function () {
  const POLICY_ID = ethers.keccak256(ethers.toUtf8Bytes('test-policy-said'));
  let registry, token, owner, minter, alice, bob;

  beforeEach(async function () {
    [owner, minter, alice, bob] = await ethers.getSigners();
    const RegistryFactory = await ethers.getContractFactory('PolicyRegistry');
    registry = await RegistryFactory.deploy();
    const updaterRole = await registry.UPDATER_ROLE();
    await registry.grantRole(updaterRole, owner.address);
    const TokenFactory = await ethers.getContractFactory('ERC20Plus');
    token = await TokenFactory.deploy('TestToken', 'TT', await registry.getAddress(), POLICY_ID);
    const minterRole = await token.MINTER_ROLE();
    await token.grantRole(minterRole, minter.address);
    await registry.setAllowed(POLICY_ID, alice.address, true);
    await registry.setAllowed(POLICY_ID, bob.address, true);
  });

  describe('Deployment', function () {
    it('stores policy registry and policy id', async function () {
      expect(await token.policyRegistry()).to.equal(await registry.getAddress());
      expect(await token.policyId()).to.equal(POLICY_ID);
    });
    it('rejects zero registry address', async function () {
      const Factory = await ethers.getContractFactory('ERC20Plus');
      await expect(Factory.deploy('X', 'X', ethers.ZeroAddress, POLICY_ID)).to.be.revertedWith('Zero registry address');
    });
    it('has correct name and symbol', async function () {
      expect(await token.name()).to.equal('TestToken');
      expect(await token.symbol()).to.equal('TT');
    });
  });

  describe('Minting', function () {
    it('minter can mint to eligible address', async function () {
      await token.connect(minter).mint(alice.address, 1000);
      expect(await token.balanceOf(alice.address)).to.equal(1000);
    });
    it('rejects mint to ineligible address', async function () {
      await registry.setAllowed(POLICY_ID, bob.address, false);
      await expect(token.connect(minter).mint(bob.address, 1000)).to.be.revertedWith('Recipient not eligible');
    });
    it('rejects mint from non-minter', async function () {
      await expect(token.connect(alice).mint(alice.address, 1000)).to.be.reverted;
    });
  });

  describe('Transfer', function () {
    beforeEach(async function () { await token.connect(minter).mint(alice.address, 1000); });
    it('eligible sender can transfer to eligible recipient', async function () {
      await token.connect(alice).transfer(bob.address, 100);
      expect(await token.balanceOf(bob.address)).to.equal(100);
      expect(await token.balanceOf(alice.address)).to.equal(900);
    });
    it('rejects transfer from ineligible sender', async function () {
      await registry.setAllowed(POLICY_ID, alice.address, false);
      await expect(token.connect(alice).transfer(bob.address, 100)).to.be.revertedWith('Sender not eligible');
    });
    it('rejects transfer to ineligible recipient', async function () {
      await registry.setAllowed(POLICY_ID, bob.address, false);
      await expect(token.connect(alice).transfer(bob.address, 100)).to.be.revertedWith('Recipient not eligible');
    });
  });

  describe('TransferFrom', function () {
    beforeEach(async function () {
      await token.connect(minter).mint(alice.address, 1000);
      await token.connect(alice).approve(bob.address, 500);
    });
    it('works with eligible sender and recipient', async function () {
      await token.connect(bob).transferFrom(alice.address, bob.address, 100);
      expect(await token.balanceOf(bob.address)).to.equal(100);
    });
    it('rejects when sender ineligible', async function () {
      await registry.setAllowed(POLICY_ID, alice.address, false);
      await expect(token.connect(bob).transferFrom(alice.address, bob.address, 100)).to.be.revertedWith('Sender not eligible');
    });
    it('rejects when recipient ineligible', async function () {
      await registry.setAllowed(POLICY_ID, bob.address, false);
      await expect(token.connect(bob).transferFrom(alice.address, bob.address, 100)).to.be.revertedWith('Recipient not eligible');
    });
  });

  describe('Burning', function () {
    beforeEach(async function () { await token.connect(minter).mint(alice.address, 1000); });
    it('eligible holder can burn', async function () {
      await token.connect(alice).burn(200);
      expect(await token.balanceOf(alice.address)).to.equal(800);
    });
    it('ineligible holder can still burn', async function () {
      await registry.setAllowed(POLICY_ID, alice.address, false);
      await token.connect(alice).burn(200);
      expect(await token.balanceOf(alice.address)).to.equal(800);
    });
  });

  describe('Revocation behaviour', function () {
    it('revoked account balance remains but transfers frozen', async function () {
      await token.connect(minter).mint(alice.address, 1000);
      await registry.setAllowed(POLICY_ID, alice.address, false);
      expect(await token.balanceOf(alice.address)).to.equal(1000);
      await expect(token.connect(alice).transfer(bob.address, 100)).to.be.revertedWith('Sender not eligible');
      await expect(token.connect(minter).mint(alice.address, 100)).to.be.revertedWith('Recipient not eligible');
    });
  });
});
