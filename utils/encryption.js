const crypto = require('crypto');
const { ethers } = require('ethers');

/**
 * BidEncryption class for encrypting bid data with issuer's public key
 */
class BidEncryption {
    constructor(issuerPublicKey) {
        // Convert hex string to Buffer if needed
        if (typeof issuerPublicKey === 'string' && issuerPublicKey.startsWith('0x')) {
            this.issuerPublicKey = Buffer.from(issuerPublicKey.replace('0x', ''), 'hex');
        } else if (Buffer.isBuffer(issuerPublicKey)) {
            this.issuerPublicKey = issuerPublicKey;
        } else {
            throw new Error('Invalid issuer public key format');
        }
    }

    /**
     * Encrypt bid data with issuer's public key
     * @param {string|BigNumber} price - Bid price
     * @param {string|BigNumber} quantity - Bid quantity  
     * @param {string|BigNumber} salt - Random salt for commitment
     * @returns {string} Hex-encoded encrypted bid data
     */
    encryptBid(price, quantity, salt) {
        const bidData = {
            price: price.toString(),
            quantity: quantity.toString(),
            salt: salt.toString(),
            timestamp: Date.now()
        };

        const plaintext = JSON.stringify(bidData);

        try {
            // Use RSA-OAEP for encryption
            const encrypted = crypto.publicEncrypt({
                key: this.issuerPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            }, Buffer.from(plaintext));

            return '0x' + encrypted.toString('hex');
        } catch (error) {
            throw new Error(`Failed to encrypt bid: ${error.message}`);
        }
    }

    /**
     * Generate commitment hash for bid reveal
     * @param {string} bidderAddress - Address of the bidder
     * @param {string|BigNumber} price - Bid price
     * @param {string|BigNumber} quantity - Bid quantity
     * @param {string|BigNumber} salt - Random salt
     * @returns {string} Commitment hash
     */
    generateCommitment(bidderAddress, price, quantity, salt) {
        const packed = ethers.solidityPacked(
            ['address', 'uint256', 'uint256', 'uint256'],
            [bidderAddress, price.toString(), quantity.toString(), salt.toString()]
        );
        return ethers.keccak256(packed);
    }

    /**
     * Generate random salt for bid commitment
     * @returns {BigNumber} Random 32-byte salt
     */
    generateSalt() {
        return ethers.getBigInt(ethers.randomBytes(32));
    }

    /**
     * Prepare complete bid data for submission
     * @param {string} bidderAddress - Address of the bidder
     * @param {string|BigNumber} price - Bid price in wei
     * @param {string|BigNumber} quantity - Bid quantity in wei
     * @returns {Object} Complete bid data for submission
     */
    prepareBid(bidderAddress, price, quantity) {
        const salt = this.generateSalt();
        const commitment = this.generateCommitment(bidderAddress, price, quantity, salt);
        const encryptedBid = this.encryptBid(price, quantity, salt);

        return {
            commitment,
            encryptedBid,
            salt: salt.toString(), // Save for reveal phase
            price: price.toString(),
            quantity: quantity.toString()
        };
    }
}

/**
 * IssuerDecryption class for issuer to decrypt and monitor bids
 */
class IssuerDecryption {
    constructor(privateKey) {
        if (typeof privateKey === 'string') {
            this.privateKey = Buffer.from(privateKey, 'hex');
        } else if (Buffer.isBuffer(privateKey)) {
            this.privateKey = privateKey;
        } else {
            throw new Error('Invalid private key format');
        }
    }

    /**
     * Decrypt bid data using issuer's private key
     * @param {string} encryptedBid - Hex-encoded encrypted bid
     * @returns {Object|null} Decrypted bid data or null if failed
     */
    decryptBid(encryptedBid) {
        try {
            const encrypted = Buffer.from(encryptedBid.replace('0x', ''), 'hex');

            const decrypted = crypto.privateDecrypt({
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            }, encrypted);

            return JSON.parse(decrypted.toString());
        } catch (error) {
            console.error('Failed to decrypt bid:', error.message);
            return null;
        }
    }

    /**
     * Monitor blockchain events and decrypt incoming bids
     * @param {Contract} auctionContract - Ethers.js contract instance
     * @param {Function} onBidReceived - Callback function for processed bids
     */
    async monitorBids(auctionContract, onBidReceived) {
        console.log('Starting bid monitoring...');

        // Listen for BidCommitted events
        auctionContract.on('BidCommitted', async (bidder, commitment, encryptedBid, event) => {
            console.log(`\n📥 New bid received from: ${bidder}`);
            console.log(`   Block: ${event.blockNumber}`);
            console.log(`   Tx: ${event.transactionHash}`);

            const bidData = this.decryptBid(encryptedBid);
            if (bidData) {
                console.log(`   💰 Price: $${ethers.formatEther(bidData.price)}`);
                console.log(`   📊 Quantity: ${ethers.formatEther(bidData.quantity)} bonds`);
                console.log(`   🕒 Timestamp: ${new Date(bidData.timestamp).toISOString()}`);

                // Call callback function if provided
                if (onBidReceived) {
                    onBidReceived({
                        bidder,
                        commitment,
                        encryptedBid,
                        decryptedData: bidData,
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash
                    });
                }
            } else {
                console.log('   ❌ Failed to decrypt bid data');
            }
        });

        // Listen for other auction events
        auctionContract.on('BidRevealed', (bidder, price, quantity, event) => {
            console.log(`\n🔍 Bid revealed by: ${bidder}`);
            console.log(`   Price: $${ethers.formatEther(price)}`);
            console.log(`   Quantity: ${ethers.formatEther(quantity)} bonds`);
        });

        auctionContract.on('AuctionFinalized', (clearingPrice, totalAllocated, event) => {
            console.log(`\n🏁 Auction finalized!`);
            console.log(`   Clearing Price: $${ethers.formatEther(clearingPrice)}`);
            console.log(`   Total Allocated: ${ethers.formatEther(totalAllocated)} bonds`);
        });
    }

    /**
     * Get summary of all decrypted bids
     * @param {Array} encryptedBids - Array of encrypted bid data
     * @returns {Array} Array of decrypted bid summaries
     */
    getBidSummary(encryptedBids) {
        return encryptedBids.map((encryptedBid, index) => {
            const bidData = this.decryptBid(encryptedBid.encryptedBid);
            return {
                index,
                bidder: encryptedBid.bidder,
                commitment: encryptedBid.commitment,
                decrypted: bidData ? {
                    price: ethers.formatEther(bidData.price),
                    quantity: ethers.formatEther(bidData.quantity),
                    timestamp: new Date(bidData.timestamp).toISOString()
                } : null
            };
        });
    }
}

/**
 * Utility functions for bid management
 */
class BidUtils {
    /**
     * Generate RSA key pair for auction
     * @param {number} modulusLength - Key size (default: 2048)
     * @returns {Object} Public and private keys
     */
    static generateKeyPair(modulusLength = 2048) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength,
            publicKeyEncoding: {
                type: 'spki',
                format: 'der'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'der'
            }
        });

        return {
            publicKey: '0x' + publicKey.toString('hex'),
            privateKey: privateKey.toString('hex'),
            publicKeyBuffer: publicKey,
            privateKeyBuffer: privateKey
        };
    }

    /**
     * Validate bid parameters
     * @param {string|BigNumber} price - Bid price
     * @param {string|BigNumber} quantity - Bid quantity
     * @param {string|BigNumber} minPrice - Minimum allowed price
     * @param {string|BigNumber} maxPrice - Maximum allowed price
     * @throws {Error} If validation fails
     */
    static validateBid(price, quantity, minPrice, maxPrice) {
        const priceBN = ethers.getBigInt(price);
        const quantityBN = ethers.getBigInt(quantity);
        const minPriceBN = ethers.getBigInt(minPrice);
        const maxPriceBN = ethers.getBigInt(maxPrice);

        if (quantityBN <= 0n) {
            throw new Error('Quantity must be greater than zero');
        }

        if (priceBN < minPriceBN) {
            throw new Error(`Price ${ethers.formatEther(price)} is below minimum ${ethers.formatEther(minPrice)}`);
        }

        if (priceBN > maxPriceBN) {
            throw new Error(`Price ${ethers.formatEther(price)} is above maximum ${ethers.formatEther(maxPrice)}`);
        }
    }

    /**
     * Calculate total payment required for a bid at clearing price
     * @param {string|BigNumber} allocation - Token allocation
     * @param {string|BigNumber} clearingPrice - Final clearing price
     * @returns {BigNumber} Payment amount in payment token units
     */
    static calculatePayment(allocation, clearingPrice) {
        const allocationBN = ethers.getBigInt(allocation);
        const clearingPriceBN = ethers.getBigInt(clearingPrice);
        return (allocationBN * clearingPriceBN) / ethers.parseEther("1");
    }

    /**
     * Format bid for display
     * @param {Object} bid - Bid object
     * @returns {string} Formatted bid string
     */
    static formatBid(bid) {
        return `Price: $${ethers.formatEther(bid.price)}, Quantity: ${ethers.formatEther(bid.quantity)} bonds`;
    }
}

module.exports = {
    BidEncryption,
    IssuerDecryption,
    BidUtils
};