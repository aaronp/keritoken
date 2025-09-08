# Load environment variables
source .env

# Deploy to Base Sepolia with automatic verification
forge script script/DeployToken.s.sol:DeployToken \
    --rpc-url base_sepolia \
    --broadcast \
    --verify