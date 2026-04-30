export const SKILL_PAYMENT_ESCROW_ABI = [
  'event SkillPaymentExecuted(bytes32 indexed skillHash, string skillId, address indexed payer, address indexed publisher, address platform, uint256 grossAmount, uint256 publisherAmount, uint256 platformFee)',
  'function executeSkillPayment(string skillId, address publisher, address platform, uint256 expectedPrice) payable',
] as const
