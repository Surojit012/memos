// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SkillPaymentEscrow is ReentrancyGuard {
    error EmptySkillId();
    error InvalidRecipient();
    error InvalidAmount();
    error PayoutFailed(string recipientType);

    event SkillPaymentExecuted(
        bytes32 indexed skillHash,
        string skillId,
        address indexed payer,
        address indexed publisher,
        address platform,
        uint256 grossAmount,
        uint256 publisherAmount,
        uint256 platformFee
    );

    function executeSkillPayment(
        string calldata skillId,
        address publisher,
        address platform,
        uint256 expectedPrice
    ) external payable nonReentrant {
        if (bytes(skillId).length == 0) revert EmptySkillId();
        if (publisher == address(0) || platform == address(0)) revert InvalidRecipient();
        if (msg.value != expectedPrice) revert InvalidAmount();

        uint256 platformFee = (expectedPrice * 5) / 100;
        uint256 publisherAmount = expectedPrice - platformFee;

        (bool platformPaid, ) = platform.call{value: platformFee}("");
        if (!platformPaid) revert PayoutFailed("platform");

        (bool publisherPaid, ) = publisher.call{value: publisherAmount}("");
        if (!publisherPaid) revert PayoutFailed("publisher");

        emit SkillPaymentExecuted(
            keccak256(bytes(skillId)),
            skillId,
            msg.sender,
            publisher,
            platform,
            expectedPrice,
            publisherAmount,
            platformFee
        );
    }
}
