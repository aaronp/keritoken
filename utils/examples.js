const { ethers } = require('ethers');
const { BidEncryption, IssuerDecryption, BidUtils } = require('./encryption');

/**
 * Example: Submit a bid to the auction
 */
async function submitBidExample() {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const signer = new ethers.Wallet('your-private-key', provider);
    
    // Contract instances (replace with actual addresses)
    const auctionAddress = '0x...';
    const auctionAbi = [
        'function issuerPublicKey() view returns (bytes)',
        'function commitBid(bytes32 commitment, bytes encryptedBid) external',
        'function revealBid(uint256 price, uint256 quantity, uint256 salt) external',
        'function minPrice() view returns (uint256)',
        'function maxPrice() view returns (uint256)'
    ];
    
    const auction = new ethers.Contract(auctionAddress, auctionAbi, signer);
    
    // Get issuer public key from contract
    const issuerPublicKey = await auction.issuerPublicKey();
    const encryption = new BidEncryption(issuerPublicKey);
    
    // Validate bid parameters
    const price = ethers.parseEther('92'); // $92 per bond
    const quantity = ethers.parseEther('1000'); // 1000 bonds
    const minPrice = await auction.minPrice();
    const maxPrice = await auction.maxPrice();
    
    try {
        BidUtils.validateBid(price, quantity, minPrice, maxPrice);
        
        // Prepare bid
        const bidData = encryption.prepareBid(
            await signer.getAddress(),
            price,
            quantity
        );
        
        console.log('Prepared bid:');
        console.log('- Price:', ethers.formatEther(price), 'ETH');
        console.log('- Quantity:', ethers.formatEther(quantity), 'bonds');
        console.log('- Commitment:', bidData.commitment);
        console.log('- Salt:', bidData.salt);
        
        // Submit encrypted bid
        const tx = await auction.commitBid(
            bidData.commitment,
            bidData.encryptedBid
        );
        
        console.log('Bid submitted! Transaction:', tx.hash);
        await tx.wait();
        
        // Store salt securely for reveal phase
        // In a real application, use secure storage
        console.log('⚠️  IMPORTANT: Save this salt for the reveal phase:', bidData.salt);
        
        return {
            transactionHash: tx.hash,
            salt: bidData.salt,
            price: bidData.price,
            quantity: bidData.quantity
        };
        
    } catch (error) {
        console.error('Bid submission failed:', error.message);
        throw error;
    }
}

/**
 * Example: Reveal a previously committed bid
 */
async function revealBidExample() {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const signer = new ethers.Wallet('your-private-key', provider);
    
    const auctionAddress = '0x...';
    const auctionAbi = [
        'function revealBid(uint256 price, uint256 quantity, uint256 salt) external'
    ];
    
    const auction = new ethers.Contract(auctionAddress, auctionAbi, signer);
    
    // Retrieve stored bid data (from secure storage)
    const storedBidData = {
        price: '92000000000000000000', // 92 ETH in wei
        quantity: '1000000000000000000000', // 1000 bonds in wei
        salt: '12345678901234567890123456789012345678901234567890123456789012345'
    };
    
    try {
        // Reveal bid
        const tx = await auction.revealBid(
            storedBidData.price,
            storedBidData.quantity,
            storedBidData.salt
        );
        
        console.log('Bid revealed! Transaction:', tx.hash);
        await tx.wait();
        
        console.log('Revealed bid details:');
        console.log('- Price:', ethers.formatEther(storedBidData.price), 'ETH');
        console.log('- Quantity:', ethers.formatEther(storedBidData.quantity), 'bonds');
        
        return tx.hash;
        
    } catch (error) {
        console.error('Bid reveal failed:', error.message);
        throw error;
    }
}

/**
 * Example: Issuer monitoring and decrypting bids
 */
async function issuerMonitoringExample() {
    // Setup provider
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Issuer's private key (from deployment)
    const issuerPrivateKey = 'your-issuer-private-key-hex';
    const decryption = new IssuerDecryption(issuerPrivateKey);
    
    const auctionAddress = '0x...';
    const auctionAbi = [
        'event BidCommitted(address indexed bidder, bytes32 commitment, bytes encryptedBid)',
        'event BidRevealed(address indexed bidder, uint256 price, uint256 quantity)',
        'event AuctionFinalized(uint256 clearingPrice, uint256 totalAllocated)',
        'function getBidderCount() view returns (uint256)',
        'function getBidder(uint256 index) view returns (address)',
        'function getEncryptedBid(address bidder) view returns (bytes)'
    ];
    
    const auction = new ethers.Contract(auctionAddress, auctionAbi, provider);
    
    // Store received bids for analysis
    const receivedBids = [];
    
    // Start monitoring
    await decryption.monitorBids(auction, (bidInfo) => {
        receivedBids.push(bidInfo);
        
        // Real-time bid analysis
        console.log('\n📊 REAL-TIME BID ANALYSIS:');
        const totalDemand = receivedBids.reduce((sum, bid) => 
            sum + parseFloat(ethers.formatEther(bid.decryptedData.quantity)), 0);
        const avgPrice = receivedBids.reduce((sum, bid) => 
            sum + parseFloat(ethers.formatEther(bid.decryptedData.price)), 0) / receivedBids.length;
            
        console.log(`   Total Bids: ${receivedBids.length}`);
        console.log(`   Total Demand: ${totalDemand.toFixed(2)} bonds`);
        console.log(`   Average Price: $${avgPrice.toFixed(2)}`);
    });
    
    // Get historical bids (if any)
    try {
        const bidderCount = await auction.getBidderCount();
        console.log(`\n📋 Found ${bidderCount} historical bids`);
        
        for (let i = 0; i < bidderCount; i++) {
            const bidder = await auction.getBidder(i);
            const encryptedBid = await auction.getEncryptedBid(bidder);
            
            if (encryptedBid !== '0x') {
                const decrypted = decryption.decryptBid(encryptedBid);
                if (decrypted) {
                    console.log(`\n📜 Historical Bid ${i + 1}:`);
                    console.log(`   Bidder: ${bidder}`);
                    console.log(`   Price: $${ethers.formatEther(decrypted.price)}`);
                    console.log(`   Quantity: ${ethers.formatEther(decrypted.quantity)} bonds`);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching historical bids:', error.message);
    }
    
    console.log('\n✅ Monitoring active. Press Ctrl+C to stop.');
}

/**
 * Example: Claim tokens after auction finalization
 */
async function claimTokensExample() {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const signer = new ethers.Wallet('your-private-key', provider);
    
    const auctionAddress = '0x...';
    const usdcAddress = '0x...';
    
    const auctionAbi = [
        'function bids(address) view returns (bytes32 commitment, bytes encryptedBid, uint256 price, uint256 quantity, bool revealed, uint256 allocation, bool claimed)',
        'function clearingPrice() view returns (uint256)',
        'function claimTokens() external'
    ];
    
    const usdcAbi = [
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function balanceOf(address account) view returns (uint256)'
    ];
    
    const auction = new ethers.Contract(auctionAddress, auctionAbi, signer);
    const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer);
    
    try {
        // Get bid information
        const bidderAddress = await signer.getAddress();
        const bid = await auction.bids(bidderAddress);
        const clearingPrice = await auction.clearingPrice();
        
        if (bid.allocation === 0n) {
            console.log('No token allocation found for this address.');
            return;
        }
        
        if (bid.claimed) {
            console.log('Tokens already claimed.');
            return;
        }
        
        // Calculate payment required
        const payment = BidUtils.calculatePayment(bid.allocation, clearingPrice);
        
        console.log('Claim Details:');
        console.log('- Allocation:', ethers.formatEther(bid.allocation), 'bonds');
        console.log('- Clearing Price:', ethers.formatEther(clearingPrice), 'ETH');
        console.log('- Payment Required:', ethers.formatUnits(payment, 6), 'USDC');
        
        // Check USDC balance
        const usdcBalance = await usdc.balanceOf(bidderAddress);
        if (usdcBalance < payment) {
            throw new Error(`Insufficient USDC balance. Required: ${ethers.formatUnits(payment, 6)}, Available: ${ethers.formatUnits(usdcBalance, 6)}`);
        }
        
        // Approve USDC spending
        console.log('Approving USDC spending...');
        const approveTx = await usdc.approve(auctionAddress, payment);
        await approveTx.wait();
        
        // Claim tokens
        console.log('Claiming tokens...');
        const claimTx = await auction.claimTokens();
        await claimTx.wait();
        
        console.log('✅ Tokens claimed successfully!');
        console.log('Transaction:', claimTx.hash);
        
        return claimTx.hash;
        
    } catch (error) {
        console.error('Token claim failed:', error.message);
        throw error;
    }
}

/**
 * Example: Generate key pair for new auction
 */
function generateKeyPairExample() {
    console.log('Generating RSA key pair for auction...');
    
    const keyPair = BidUtils.generateKeyPair(2048);
    
    console.log('\n🔑 Generated Key Pair:');
    console.log('Public Key (for contract deployment):');
    console.log(keyPair.publicKey);
    
    console.log('\nPrivate Key (keep secure!):');
    console.log(keyPair.privateKey);
    
    console.log('\n⚠️  SECURITY WARNINGS:');
    console.log('- Store the private key in a secure location');
    console.log('- Never commit private key to version control');
    console.log('- Use HSM or encrypted storage for production');
    console.log('- The private key is needed to decrypt bids during auction');
    
    return keyPair;
}

module.exports = {
    submitBidExample,
    revealBidExample,
    issuerMonitoringExample,
    claimTokensExample,
    generateKeyPairExample
};