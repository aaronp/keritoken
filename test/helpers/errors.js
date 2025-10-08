/**
 * Standard error messages from contracts
 * Use these constants for consistent error checking in tests
 */
module.exports = {
  // GovernanceToken errors
  RECIPIENT_NOT_WHITELISTED: "Recipient not whitelisted",
  SENDER_NOT_WHITELISTED: "Sender not whitelisted",
  ALREADY_WHITELISTED: "Address already whitelisted",
  NOT_WHITELISTED: "Address not whitelisted",
  ZERO_ADDRESS: "Cannot whitelist zero address",

  // Token errors
  INVALID_GOVERNANCE: "Invalid governance token address",

  // OpenZeppelin Ownable errors
  UNAUTHORIZED: "OwnableUnauthorizedAccount",
};
