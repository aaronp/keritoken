const hre = require("hardhat");
const crypto = require('crypto');

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Generate or load issuer's RSA key pair for bid encryption
  console.log("Generating RSA key pair for bid encryption...");
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Convert public key to hex for storage in contract
  const issuerPublicKeyHex = '0x' + publicKey.toString('hex');

  // Deploy Bond Token
  console.log("\nDeploying BondToken...");
  const BondToken = await hre.ethers.getContractFactory("BondToken");
  const bondToken = await BondToken.deploy(
    "Treasury Bond 2025",
    "TB25",
    hre.ethers.parseEther("1000000"), // 1M bonds max supply
    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year maturity
    100, // $100 face value
    250 // 2.5% coupon rate (basis points)
  );
  await bondToken.waitForDeployment();
  console.log("BondToken deployed to:", await bondToken.getAddress());

  // Deploy Mock USDC (for testing) or use real USDC on mainnet
  let usdc;
  const network = hre.network.name;
  
  if (network === "base") {
    // Use real USDC on Base mainnet
    const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("Using real USDC on Base:", USDC_BASE);
    usdc = { getAddress: () => USDC_BASE };
  } else {
    // Deploy Mock USDC for testing
    console.log("\nDeploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    console.log("MockUSDC deployed to:", await usdc.getAddress());
  }

  // Deploy Auction with issuer public key
  console.log("\nDeploying BondAuction...");
  const BondAuction = await hre.ethers.getContractFactory("BondAuction");
  const auction = await BondAuction.deploy(
    await bondToken.getAddress(),
    await usdc.getAddress(),
    hre.ethers.parseEther("100000"), // 100k bonds for auction
    hre.ethers.parseEther("85"), // $85 minimum price
    hre.ethers.parseEther("100"), // $100 maximum price
    3 * 24 * 60 * 60, // 3 days commit phase
    2 * 24 * 60 * 60, // 2 days reveal phase
    7 * 24 * 60 * 60, // 7 days claim phase
    issuerPublicKeyHex // Issuer's public key for encryption
  );
  await auction.waitForDeployment();
  console.log("BondAuction deployed to:", await auction.getAddress());

  // Grant minter role to auction
  console.log("\nGranting MINTER_ROLE to auction contract...");
  const MINTER_ROLE = await bondToken.MINTER_ROLE();
  await bondToken.grantRole(MINTER_ROLE, await auction.getAddress());
  console.log("MINTER_ROLE granted successfully");

  // Verify contracts on block explorer (if not local)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await bondToken.deploymentTransaction().wait(5);
    await auction.deploymentTransaction().wait(5);

    try {
      console.log("Verifying BondToken...");
      await hre.run("verify:verify", {
        address: await bondToken.getAddress(),
        constructorArguments: [
          "Treasury Bond 2025",
          "TB25",
          hre.ethers.parseEther("1000000"),
          Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
          100,
          250
        ],
      });

      if (network !== "base") {
        console.log("Verifying MockUSDC...");
        await hre.run("verify:verify", {
          address: await usdc.getAddress(),
          constructorArguments: [],
        });
      }

      console.log("Verifying BondAuction...");
      await hre.run("verify:verify", {
        address: await auction.getAddress(),
        constructorArguments: [
          await bondToken.getAddress(),
          await usdc.getAddress(),
          hre.ethers.parseEther("100000"),
          hre.ethers.parseEther("85"),
          hre.ethers.parseEther("100"),
          3 * 24 * 60 * 60,
          2 * 24 * 60 * 60,
          7 * 24 * 60 * 60,
          issuerPublicKeyHex
        ],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Network:", network);
  console.log("BondToken:", await bondToken.getAddress());
  console.log("PaymentToken:", await usdc.getAddress());
  console.log("BondAuction:", await auction.getAddress());
  console.log("Issuer Public Key:", issuerPublicKeyHex);
  
  // Bond details
  console.log("\n=== BOND DETAILS ===");
  console.log("Name:", await bondToken.name());
  console.log("Symbol:", await bondToken.symbol());
  console.log("Max Supply:", hre.ethers.formatEther(await bondToken.cap()));
  console.log("Maturity Date:", new Date(Number(await bondToken.maturityDate()) * 1000).toISOString());
  console.log("Face Value: $" + Number(await bondToken.faceValue()));
  console.log("Coupon Rate:", Number(await bondToken.couponRate()) / 100 + "%");

  // Auction details
  console.log("\n=== AUCTION DETAILS ===");
  console.log("Bond Supply:", hre.ethers.formatEther(await auction.bondSupply()));
  console.log("Min Price:", "$" + hre.ethers.formatEther(await auction.minPrice()));
  console.log("Max Price:", "$" + hre.ethers.formatEther(await auction.maxPrice()));
  console.log("Commit Deadline:", new Date(Number(await auction.commitDeadline()) * 1000).toISOString());
  console.log("Reveal Deadline:", new Date(Number(await auction.revealDeadline()) * 1000).toISOString());
  console.log("Claim Deadline:", new Date(Number(await auction.claimDeadline()) * 1000).toISOString());

  console.log("\n=== IMPORTANT SECURITY NOTES ===");
  console.log("⚠️  CRITICAL: Save this private key securely for decrypting bids:");
  console.log("Private Key (HEX):", privateKey.toString('hex'));
  console.log("\n⚠️  DO NOT SHARE OR COMMIT THE PRIVATE KEY TO VERSION CONTROL!");
  console.log("⚠️  Store it in a secure location (HSM, encrypted file, etc.)");
  console.log("\n✅ Deployment completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});