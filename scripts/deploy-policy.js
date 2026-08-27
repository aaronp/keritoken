const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const RegistryFactory = await ethers.getContractFactory('PolicyRegistry');
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log('PolicyRegistry deployed at:', registryAddr);

  const updaterRole = await registry.UPDATER_ROLE();
  await registry.grantRole(updaterRole, deployer.address);
  console.log('UPDATER_ROLE granted to deployer');

  console.log('\nTo deploy an ERC20Plus token:');
  console.log('  npx hardhat console --network <network>');
  console.log("  const F = await ethers.getContractFactory('ERC20Plus')");
  console.log("  const policyId = ethers.keccak256(ethers.toUtf8Bytes('<your-said>'))");
  console.log(`  const t = await F.deploy('Name', 'SYM', '${registryAddr}', policyId)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
