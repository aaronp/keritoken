const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log(`Network: ${network} (chainId: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  const bridgeSigner = process.env.BRIDGE_SIGNER;
  const policySAID = process.env.POLICY_SAID;

  if (!bridgeSigner || !policySAID) {
    console.error("Set BRIDGE_SIGNER and POLICY_SAID environment variables");
    console.error("Example:");
    console.error("  BRIDGE_SIGNER=0x... POLICY_SAID=0x... make deploy");
    process.exit(1);
  }

  console.log(`\nBridge Signer: ${bridgeSigner}`);
  console.log(`Policy SAID: ${policySAID}`);

  const Factory = await hre.ethers.getContractFactory("ComplianceRegistry");
  const registry = await Factory.deploy(bridgeSigner, policySAID);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  console.log(`\nComplianceRegistry deployed to: ${registryAddr}`);

  if (network !== "hardhat" && network !== "localhost") {
    console.log("Waiting for confirmations...");
    await registry.deploymentTransaction().wait(5);
    try {
      await hre.run("verify:verify", {
        address: registryAddr,
        constructorArguments: [bridgeSigner, policySAID],
      });
      console.log("Contract verified on block explorer");
    } catch (e) {
      console.log("Verification failed:", e.message);
    }
  }

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Network:          ${network} (${chainId})`);
  console.log(`Registry:         ${registryAddr}`);
  console.log(`Bridge Signer:    ${bridgeSigner}`);
  console.log(`Policy SAID:      ${policySAID}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
