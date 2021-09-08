// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title RetroactiveVesting
 * @notice A token holder contract that can release its token balance linearly over
 * the vesting period. Respective address and the amount are included in each merkle node.
 */
contract RetroactiveVesting {
    using SafeERC20 for IERC20;

    struct VestingData {
        bool isVerified;
        uint120 totalAmount;
        uint120 released;
    }

    event Claimed(address account, uint256 amount);

    IERC20 public immutable TOKEN;
    bytes32 public immutable MERKLE_ROOT;
    uint256 public immutable START_TIMESTAMP;
    uint256 public constant DURATION = 2 * (52 weeks);

    mapping(address => VestingData) public vestings;

    /**
     * @notice Deploys this contract with given parameters
     * @param token_ Address of the token that will be vested
     * @param merkleRoot_ Bytes of the merkle root node which is generated off chain.
     * @param startTimestamp_ Timestamp in seconds when to start vesting. This can be backdated as well.
     */
    constructor(
        IERC20 token_,
        bytes32 merkleRoot_,
        uint256 startTimestamp_
    ) public {
        TOKEN = token_;
        MERKLE_ROOT = merkleRoot_;
        START_TIMESTAMP = startTimestamp_;
    }

    /**
     * @notice Verifies the given account is eligible for the given amount. Then claims the
     * vested amount out of the total amount eligible.
     * @param account Address of the account that the caller is verifying for
     * @param totalAmount Total amount that will be vested linearly
     * @param merkleProof Merkle proof that was generated off chain.
     */
    function verifyAndClaimReward(
        address account,
        uint256 totalAmount,
        bytes32[] calldata merkleProof
    ) external {
        VestingData storage vesting = vestings[account];
        if (!vesting.isVerified) {
            // Verify the merkle proof.
            bytes32 node = keccak256(abi.encodePacked(account, totalAmount));
            require(
                MerkleProof.verify(merkleProof, MERKLE_ROOT, node),
                "could not verify merkleProof"
            );
            // Save the verified state
            vesting.isVerified = true;
            vesting.totalAmount = uint120(totalAmount);
        }
        _claimReward(account);
    }

    /**
     * @notice Claims the vested amount out of the total amount eligible for the given account.
     * @param account Address of the account that the caller is claiming for. If this is set
     * to `address(0)`, it will use the `msg.sender` instead.
     */
    function claimReward(address account) external {
        if (account == address(0)) {
            account = msg.sender;
        }
        require(vestings[account].isVerified, "must verify first");
        _claimReward(account);
    }

    function _claimReward(address account) internal {
        VestingData storage vesting = vestings[account];
        uint256 released = vesting.released;
        uint256 amount = _vestedAmount(
            vesting.totalAmount,
            released,
            START_TIMESTAMP,
            DURATION
        );
        vesting.released = uint120(amount + released);
        TOKEN.safeTransfer(account, amount);

        emit Claimed(account, amount);
    }

    /**
     * @notice Calculated the amount that has already vested but hasn't been released yet.
     * Reverts if the given account has not been verified.
     * @param account Address to calculated the vested amount for
     */
    function vestedAmount(address account) external view returns (uint256) {
        require(vestings[account].isVerified, "must verify first");
        return
            _vestedAmount(
                vestings[account].totalAmount,
                vestings[account].released,
                START_TIMESTAMP,
                DURATION
            );
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been released yet.
     */
    function _vestedAmount(
        uint256 total,
        uint256 released,
        uint256 startTimestamp,
        uint256 durationInSeconds
    ) internal view returns (uint256) {
        uint256 blockTimestamp = block.timestamp;

        // If current block is before the start, there are no vested amount.
        if (blockTimestamp < startTimestamp) {
            return 0;
        }

        uint256 elapsedTime = blockTimestamp - startTimestamp;
        uint256 vested;

        // If over vesting duration, all tokens vested
        if (elapsedTime >= durationInSeconds) {
            vested = total;
        } else {
            vested = (total * elapsedTime) / durationInSeconds;
        }

        return vested - released;
    }
}
