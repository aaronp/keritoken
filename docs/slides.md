# Bond Auction Platform
## Complete User Workflow

A step-by-step guide to creating bonds, auctions, and bidding

<div class="pt-12">
  <span @click="$slidev.nav.next" class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
    Press Space for next slide <carbon:arrow-right class="inline"/>
  </span>
</div>

---

# Overview

This Bond Auction application demonstrates:

- **Bond Creation**: A bond smart contract ([BondToken.sol](https://github.com/aaronp/auctions/blob/master/contracts/BondToken.sol))
- **Auction Setup**: An auction smart contract ([BondAuction.sol](https://github.com/aaronp/auctions/blob/master/contracts/BondAuction.sol)) for the bond
- **Secure Bidding**: Allow encrypted bids on the Bond which the issuer can observe
- **A Transaction Exploration**: View and analyze all transactions (basic block explorer)


The webapp is available [here](https://aaronp.github.io/auctions), and the code is [here](https://github.com/aaronp/auctions)

---
theme: seriph
---
# Step 1: Setup
*Setup*

This documentation shows the workflow of creating a bond, auction, and bids against a 
locally running [hardhat](https://hardhat.org/hardhat2/redirect?r=%2Fhardhat-runner%2Fdocs%2Fgetting-started#overview) instance.

<div v-click="1" class="absolute" v-click-hide="2">

If you've cloned this project, you can start the network using `make node` to start it on localhost:8545:

<div class="flex items-center justify-center">
  <img src="/localstart.png" class="w-96 object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/localstart.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>



</div>

<div v-click="2" class="absolute" v-click-hide="3">

<div class="space-y-6">

  ## Quick Start
  ```bash
  # Install dependencies
  make install

  # Start local blockchain
  make node

  # Deploy contracts  
  make deploy-local

  # Run frontend
  make ui
  ```

  </div>
</div>



<div v-click="3" class="absolute" v-click-hide="4">

<div class="space-y-6">

  ## Testing
  ```bash
  # Run complete workflow test
  make auction-test
  ```

  </div>
</div>


<div v-click="4" class="absolute">

Open [Metamask](https://metamask.io/en-GB) in your browser to then import one (or more) of the listed accounts :

<div class="flex items-center justify-center">
  <img src="/0_metamask.png" class="w-45 object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/0_metamask.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>

</div>


---

# Step 2: Wallet Connected
**Connecting**

When opening [the app (here)](https://aaronp.github.io/auctions), you should see the connected wallet at the top:

<div class="flex items-center justify-center">
  <img src="/1_connected.png" class="w-75 object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/1_connected.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>

This gives you a visual confirmation that the loaded account matches the expected account in Metamask.

If you change accounts in Metamask, be sure to disconnect and reconnect in the app.

---

# Step 3: Create Bond Token
*Creating a Bond*

<div class="grid grid-cols-2 gap-8 h-96 items-start">
  <div class="space-y-4">
    <p>Fill in the form to create a new bond token:</p>
    <ul class="space-y-2">
      <li><strong>Name & Symbol</strong>: Token identification</li>
      <li><strong>Supply & Face Value</strong>: Economic parameters</li>
      <li><strong>Coupon Rate</strong>: Interest rate</li>
      <li><strong>Maturity</strong>: Duration in months</li>
    </ul>
<div class="mt-2">And then choose 'Deploy Bond Token'</div>    
  </div>

  <div>
    <img src="/2_createBond.png" class="w-70 object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/2_createBond.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
  </div>
</div>

---

# Step 4: Sign Deployment
*Blockchain transaction*

A prompt should appear to sign the deployment of the contract.

<div class="flex items-center justify-center h-66">
  <img src="/3_signDeploy.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/3_signDeploy.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>

If you're connecting to testnet or mainnet, be sure to review the gas fees and confirm to deploy your bond token contract.

---

# Step 5: Bond Deployed

Your bond token is now deployed! The contract address is saved locally and displayed with a success confirmation.

<div class="flex items-center justify-center h-86">
  <img src="/4_deployed.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/4_deployed.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>


---

# Step 6: Create Auction
**Now let's deploy an auction contract**

<div class="grid grid-cols-2 gap-8 h-96 items-start">
  <div class="space-y-4">
    <p>Complete the auction parameters:</p>
    <v-clicks>
        <ul class="space-y-2">
          <li><strong>Bond Token</strong>: Select the deployed bond you wish to auction</li>
          <li><strong>Price Range</strong>: Min/max bid prices</li>
          <li><strong>Timeline</strong>: Commit, reveal, and claim phases</li>
        </ul>
    </v-clicks>
  </div>

  <div class="flex items-center justify-center h-86">
    <img src="/5_createAuction.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/5_createAuction.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
  </div>
</div>


---

# Step 7: Deploy Auction
*Secret Bids*



<div class="grid grid-cols-2 gap-8 h-96 items-start">
  <div class="space-y-4">
    <p>There are many ways to allow the issuer to view submitted bids.</p>
    <p>In this app, a new keypair is created when deploying the auction contract.</p>
    <p>Entrant's bids are then encrypted using the public key.</p>
    <p>The key is saved in local storage, and so the issuer can view bid events as they come in.</p>
    <v-clicks><p><span class="font-bold">Action:</span> Click 'Deploy Auction Contract' to deploy the contract and reveal the private key</p></v-clicks>
  </div>

<div class="flex items-center justify-center h-96">
  <img src="/6_deployAuction.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/6_deployAuction.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>
</div>


---

# Step 8: Auction Deployed  
*Ready for bidding*

The auction is live! The contract is deployed and ready to accept encrypted bids during the commit phase.


<div class="flex items-center justify-center h-96">
  <img src="/7_deployed.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/7_deployed.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>



---

# Step 9: Check Logs
*Transaction verification*

If you've connected to your local hardhat network with your metamask account, you should see the transaction output in the logs: 

<div class="flex items-center justify-center h-96">
  <img src="/8_checkLogs.png" class="w-126 object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/8_checkLogs.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>

Move on to the 'Bid on Auction' tab to bid on the bond

---

# Step 10: Choose Auction
**Bidding**

Browse available auctions and select one to bid on. View auction details including price ranges and deadlines.

<div class="flex items-center justify-center">
  <img src="/9_bidChoice.png" class="h-86 object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/9_bidChoice.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>


---

# Step 11: Submit Bid
*Encrypted bidding*

<div class="grid grid-cols-2 gap-8 h-96 items-start">
  <div class="space-y-4">
    <p>Feel free to switch Metamask accounts to bid as different participants</p>
    <p>Enter in your bid details:</p>
    <ul>
      <li><strong>Price</strong> Your bid price per bond</li>
      <li><strong>Quantity:</strong> Number of bonds to purchase</li>
      <li><strong>Encryption:</strong> Bid is automatically encrypted with RSA</li>
    </ul>
    <v-clicks><p><span class="font-bold">Action:</span> Click 'Submit  Bid' to submit your bid</p></v-clicks>
  </div>


  <div class="flex items-center justify-center h-96">
    <img src="/10_submitBid.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/10_submitBid.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
  </div>
</div>



---

# Step 12: Bid Submitted
*Transaction confirmed*

<div class="flex items-center justify-center h-96">
  <img src="/11_bidSubmitted.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/11_bidSubmitted.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
</div>

Success! Your encrypted bid is committed to the blockchain. The bid details are saved locally for the reveal phase.

---

# Step 13: Explorer View
*Analyzing transactions*

<div class="grid grid-cols-2 gap-8 h-96 items-start">
<div>
Use the built-in explorer to:
<v-clicks>
<ul>
  <li><strong>Decode Events</strong>: View human-readable event data</li>
  <li><strong>Track Transactions</strong>: Monitor all your activities</li>
  <li><strong>Reveal Bids</strong>: Decrypt bids when you have the private key</li>
</ul>
</v-clicks>
</div>
  <div class="space-y-4">
    <div class="flex items-center justify-center h-96">
      <img src="/12_explorerViewsBid.png" class="max-h-full max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform" @click="(e) => { const link = e.target.ownerDocument.createElement('a'); link.href = '/auctions/docs/12_explorerViewsBid.png'; link.target = '_blank'; link.rel = 'noopener'; e.target.ownerDocument.body.appendChild(link); link.click(); e.target.ownerDocument.body.removeChild(link); }"/>
    </div>
</div>
</div>

---

# Architecture Overview

```mermaid
graph TB
    A[User Wallet] --> B[React Frontend]
    B --> C[Smart Contracts]
    C --> D[BondToken Contract]
    C --> E[BondAuction Contract]
    C --> F[Payment Token]
    
    B --> G[Local Storage]
    G --> H[Contract Addresses]
    G --> I[Private Keys]
    G --> J[Bid History]
    
    E --> K[RSA Encryption]
    K --> L[Encrypted Bids]
    L --> M[Reveal Phase]
```

---

# Thank You!

<div class="text-center space-y-8">

## Bond Auction Platform
**Secure, Transparent, Decentralized**

<div class="flex justify-center space-x-8 pt-8">
  <div class="text-center">
    <div class="text-4xl">🏛️</div>
    <div>Create Bonds</div>
  </div>
  <div class="text-center">
    <div class="text-4xl">🔨</div>
    <div>Run Auctions</div>
  </div>
  <div class="text-center">
    <div class="text-4xl">💰</div>
    <div>Submit Bids</div>
  </div>
  <div class="text-center">
    <div class="text-4xl">🔍</div>
    <div>Explore Data</div>
  </div>
</div>

<div class="pt-8 text-gray-500">
Ready to get started? Connect your wallet and create your first bond!
</div>

</div>