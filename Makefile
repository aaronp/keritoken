# KeriToken — JWT Compliance Bridge
# Usage: make <target> [NETWORK=localhost|baseSepolia|base]

NETWORK ?= localhost

.PHONY: help install compile clean test test-contract test-bridge test-integration \
        deploy node dev build-ui coverage env-setup abi

help:
	@echo "KeriToken — JWT Compliance Bridge"
	@echo ""
	@echo "Testing:"
	@echo "  make test                  Run all tests (local Hardhat)"
	@echo "  make test-contract         Run contract tests only"
	@echo "  make test-bridge           Run bridge library tests only"
	@echo "  make test-integration      Run integration tests"
	@echo "  make coverage              Generate coverage report"
	@echo ""
	@echo "Development:"
	@echo "  make install               Install dependencies"
	@echo "  make compile               Compile smart contracts"
	@echo "  make node                  Start local Hardhat node"
	@echo "  make dev                   Start UI dev server"
	@echo "  make clean                 Clean build artifacts"
	@echo ""
	@echo "Deployment (set NETWORK=localhost|baseSepolia|base):"
	@echo "  make deploy                Deploy ComplianceRegistry"
	@echo "  make deploy NETWORK=baseSepolia"
	@echo ""
	@echo "Build:"
	@echo "  make abi                   Extract ABI JSON files to abi/"
	@echo "  make abi ABI_DIR=path      Extract ABIs to custom directory"
	@echo ""
	@echo "UI:"
	@echo "  make build-ui              Build UI for GitHub Pages"

install:
	npm install
	cd ui && npm install

compile:
	npx hardhat compile

clean:
	rm -rf artifacts/ cache/ typechain-types/

test: compile
	npx hardhat test

test-contract: compile
	npx hardhat test test/ComplianceRegistry.test.js test/GovernanceToken.test.js test/Token.test.js

test-bridge: compile
	npx hardhat test test/bridge.test.js

test-integration: compile
	npx hardhat test test/integration/*.test.js

coverage: compile
	npx hardhat coverage

node:
	npx hardhat node

deploy: compile
	npx hardhat run scripts/deploy-compliance.js --network $(NETWORK)

dev:
	cd ui && npm run dev

build-ui:
	cd ui && npm run build

ABI_DIR ?= abi

abi: compile
	@mkdir -p $(ABI_DIR)
	@for contract in ComplianceRegistry GovernanceToken Token; do \
		jq '.abi' artifacts/contracts/$$contract.sol/$$contract.json > $(ABI_DIR)/$$contract.abi.json && \
		echo "  $(ABI_DIR)/$$contract.abi.json"; \
	done
	@echo "ABI files ready in $(ABI_DIR)/"

env-setup:
	@if [ ! -f .env ]; then \
		echo "PRIVATE_KEY=" > .env; \
		echo "SEPOLIA_RPC_URL=" >> .env; \
		echo "BASE_RPC_URL=https://mainnet.base.org" >> .env; \
		echo "BASE_SEPOLIA_RPC_URL=https://sepolia.base.org" >> .env; \
		echo "BASESCAN_API_KEY=" >> .env; \
		echo "Created .env — fill in your values"; \
	else \
		echo ".env already exists"; \
	fi
