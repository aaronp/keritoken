// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BondToken.sol";

contract BondAuction is Ownable, ReentrancyGuard {
    uint256 public bondSupply;
    uint256 public minPrice;
    uint256 public maxPrice;
    uint256 public commitDeadline;
    uint256 public revealDeadline;
    uint256 public claimDeadline;
    
    bytes public issuerPublicKey;
    
    BondToken public bondToken;
    IERC20 public paymentToken;
    
    enum AuctionState { Setup, Commit, Reveal, Finalized, Distributed }
    AuctionState public state;
    
    struct Bid {
        bytes32 commitment;
        bytes encryptedBid;
        uint256 price;
        uint256 quantity;
        bool revealed;
        uint256 allocation;
        bool claimed;
    }
    
    mapping(address => Bid) public bids;
    address[] public bidders;
    
    uint256 public clearingPrice;
    uint256 public totalAllocated;
    
    event BidCommitted(address indexed bidder, bytes32 commitment, bytes encryptedBid);
    event BidRevealed(address indexed bidder, uint256 price, uint256 quantity);
    event AuctionFinalized(uint256 clearingPrice, uint256 totalAllocated);
    event TokensClaimed(address indexed bidder, uint256 allocation, uint256 payment);
    event IssuerPublicKeySet(bytes publicKey);
    
    constructor(
        address _bondToken,
        address _paymentToken,
        uint256 _bondSupply,
        uint256 _minPrice,
        uint256 _maxPrice,
        uint256 _commitDuration,
        uint256 _revealDuration,
        uint256 _claimDuration,
        bytes memory _issuerPublicKey
    ) Ownable(msg.sender) {
        require(_minPrice < _maxPrice, "Invalid price range");
        require(_issuerPublicKey.length > 0, "Invalid issuer public key");
        
        bondToken = BondToken(_bondToken);
        paymentToken = IERC20(_paymentToken);
        bondSupply = _bondSupply;
        minPrice = _minPrice;
        maxPrice = _maxPrice;
        commitDeadline = block.timestamp + _commitDuration;
        revealDeadline = commitDeadline + _revealDuration;
        claimDeadline = revealDeadline + _claimDuration;
        issuerPublicKey = _issuerPublicKey;
        state = AuctionState.Commit;
        
        emit IssuerPublicKeySet(_issuerPublicKey);
    }
    
    function commitBid(bytes32 commitment, bytes calldata encryptedBid) external {
        require(state == AuctionState.Commit, "Not in commit phase");
        require(block.timestamp < commitDeadline, "Commit phase ended");
        require(bids[msg.sender].commitment == bytes32(0), "Bid already committed");
        require(encryptedBid.length > 0, "Invalid encrypted bid");
        
        bids[msg.sender].commitment = commitment;
        bids[msg.sender].encryptedBid = encryptedBid;
        bidders.push(msg.sender);
        
        emit BidCommitted(msg.sender, commitment, encryptedBid);
    }
    
    function revealBid(uint256 price, uint256 quantity, uint256 salt) external {
        require(state == AuctionState.Reveal || 
                (state == AuctionState.Commit && block.timestamp >= commitDeadline), 
                "Not in reveal phase");
        require(block.timestamp < revealDeadline, "Reveal phase ended");
        
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, price, quantity, salt));
        require(bids[msg.sender].commitment == commitment, "Invalid reveal");
        require(price >= minPrice && price <= maxPrice, "Price out of range");
        require(quantity > 0, "Invalid quantity");
        
        bids[msg.sender].price = price;
        bids[msg.sender].quantity = quantity;
        bids[msg.sender].revealed = true;
        
        if (state == AuctionState.Commit) {
            state = AuctionState.Reveal;
        }
        
        emit BidRevealed(msg.sender, price, quantity);
    }
    
    function getEncryptedBid(address bidder) external view returns (bytes memory) {
        return bids[bidder].encryptedBid;
    }
    
    function finalize() external onlyOwner {
        require(state == AuctionState.Reveal || 
                (state == AuctionState.Commit && block.timestamp >= revealDeadline), 
                "Cannot finalize yet");
        
        address[] memory sortedBidders = _sortBiddersByPrice();
        
        uint256 remainingSupply = bondSupply;
        uint256 marginalPrice = minPrice;
        uint256 marginalDemand = 0;
        address[] memory marginalBidders = new address[](bidders.length);
        uint256 marginalBidderCount = 0;
        
        for (uint256 i = 0; i < sortedBidders.length; i++) {
            address bidder = sortedBidders[i];
            Bid storage bid = bids[bidder];
            
            if (!bid.revealed) continue;
            
            if (remainingSupply >= bid.quantity) {
                bid.allocation = bid.quantity;
                remainingSupply -= bid.quantity;
                marginalPrice = bid.price;
            } else {
                marginalPrice = bid.price;
                
                for (uint256 j = i; j < sortedBidders.length; j++) {
                    address marginalBidder = sortedBidders[j];
                    Bid storage marginalBid = bids[marginalBidder];
                    
                    if (marginalBid.revealed && marginalBid.price == marginalPrice) {
                        marginalBidders[marginalBidderCount++] = marginalBidder;
                        marginalDemand += marginalBid.quantity;
                    }
                }
                break;
            }
        }
        
        if (marginalDemand > 0 && remainingSupply > 0) {
            for (uint256 i = 0; i < marginalBidderCount; i++) {
                address bidder = marginalBidders[i];
                Bid storage bid = bids[bidder];
                
                bid.allocation = (bid.quantity * remainingSupply) / marginalDemand;
            }
        }
        
        clearingPrice = marginalPrice;
        totalAllocated = bondSupply - remainingSupply;
        state = AuctionState.Finalized;
        
        emit AuctionFinalized(clearingPrice, totalAllocated);
    }
    
    function claimTokens() external nonReentrant {
        require(state == AuctionState.Finalized, "Auction not finalized");
        require(block.timestamp < claimDeadline, "Claim period ended");
        
        Bid storage bid = bids[msg.sender];
        require(bid.revealed, "Bid not revealed");
        require(bid.allocation > 0, "No allocation");
        require(!bid.claimed, "Already claimed");
        
        bid.claimed = true;
        
        uint256 payment = (bid.allocation * clearingPrice) / 1e18;
        
        require(paymentToken.transferFrom(msg.sender, address(this), payment), "Payment transfer failed");
        
        bondToken.mint(msg.sender, bid.allocation);
        
        emit TokensClaimed(msg.sender, bid.allocation, payment);
    }
    
    function withdrawProceeds() external onlyOwner {
        require(state == AuctionState.Finalized, "Auction not finalized");
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "No proceeds to withdraw");
        require(paymentToken.transfer(owner(), balance), "Transfer failed");
    }
    
    function _sortBiddersByPrice() private view returns (address[] memory) {
        address[] memory sorted = new address[](bidders.length);
        for (uint256 i = 0; i < bidders.length; i++) {
            sorted[i] = bidders[i];
        }
        
        for (uint256 i = 0; i < sorted.length - 1; i++) {
            for (uint256 j = 0; j < sorted.length - i - 1; j++) {
                if (bids[sorted[j]].price < bids[sorted[j + 1]].price) {
                    address temp = sorted[j];
                    sorted[j] = sorted[j + 1];
                    sorted[j + 1] = temp;
                }
            }
        }
        
        return sorted;
    }
    
    function getBidderCount() external view returns (uint256) {
        return bidders.length;
    }
    
    function getBidder(uint256 index) external view returns (address) {
        return bidders[index];
    }
}