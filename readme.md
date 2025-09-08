# Auctions

This project demonstrates an MVP bid contract where participants can bid on an auction contract. Once the auction concludes, the winner is allocated tokens.

It is built on Coinbase base (https://www.base.org/).


```mermaid
sequenceDiagram
    participant Issuer
    participant Auction as Auction Contract
    participant CASH as ERC20 Stablecoin
    participant BOND as Bond Token
    participant DealerA
    participant DealerB

    Issuer->>Auction: deploy auction (params: supply, min/max price, time windows)
    Issuer->>BOND: grant MINTER to Auction (cap = issue size)

    DealerA->>Auction: commitBid(hash(A, priceA, qtyA, saltA))
    DealerB->>Auction: commitBid(hash(B, priceB, qtyB, saltB))
    Note over DealerA,DealerB: Commit phase ends

    DealerA->>Auction: revealBid(priceA, qtyA, saltA)
    DealerB->>Auction: revealBid(priceB, qtyB, saltB)
    Note over Auction: Reveal phase ends

    Auction->>Auction: finalize() => sort bids, find clearing price, allocate (pro-rata at margin)
    Auction->>BOND: mint allocated BOND to winners (reserved to claim)
    Note over Auction: Clearing price & allocations fixed

    DealerA->>CASH: approve(Auction, paymentA)
    DealerA->>Auction: claim()
    Auction->>CASH: transferFrom(DealerA -> Issuer, paymentA)
    Auction->>BOND: transfer(Auction -> DealerA, allocationA)

```