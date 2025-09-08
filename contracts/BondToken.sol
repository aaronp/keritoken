// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract BondToken is ERC20, ERC20Capped, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 public maturityDate;
    uint256 public faceValue;
    uint256 public couponRate;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        uint256 _maturityDate,
        uint256 _faceValue,
        uint256 _couponRate
    ) ERC20(name, symbol) ERC20Capped(_maxSupply) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        maturityDate = _maturityDate;
        faceValue = _faceValue;
        couponRate = _couponRate;
    }
    
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Capped) {
        super._update(from, to, value);
    }
}