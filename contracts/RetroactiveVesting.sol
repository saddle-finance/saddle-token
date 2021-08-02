// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract RetroactiveVesting {
    using SafeERC20 for IERC20;

    event Claimed(address account, uint256 amount);

    struct VestingData {
        bool isVerified;
        uint96 totalAmount;
        uint96 released;
    }

    mapping(address => VestingData) public vestings;

    IERC20 public immutable token;
    bytes32 public immutable merkleRoot;

    uint256 public durationInSeconds;
    uint256 public startTimestamp;
    address public governance;
    address public pendingGovernance;

    constructor(
        IERC20 token_,
        bytes32 merkleRoot_,
        uint256 startTimestamp_,
        uint256 durationInSeconds_
    ) public {
        token = token_;
        merkleRoot = merkleRoot_;
        startTimestamp = startTimestamp_;
        durationInSeconds = durationInSeconds_;
    }

    function verifyAndClaimReward(
        address account,
        uint96 totalAmount,
        bytes32[] calldata merkleProof
    ) external {
        VestingData storage vesting = vestings[account];
        if (!vesting.isVerified) {
            // Verify the merkle proof.
            bytes32 node = keccak256(abi.encodePacked(account, totalAmount));
            require(
                MerkleProof.verify(merkleProof, merkleRoot, node),
                "MerkleDistributor: Invalid proof."
            );
            vesting.isVerified = true;
            vesting.totalAmount = totalAmount;
        }
        _claimReward(account);
    }

    function claimReward(address account) external {
        require(vestings[account].isVerified, "must verify first");
        _claimReward(account);
    }

    function _claimReward(address account) internal {
        VestingData storage vesting = vestings[account];
        uint256 released = vesting.released;
        uint256 amount = _vestedAmount(vesting.totalAmount, released);
        vesting.released = uint96(amount - released);
        token.safeTransfer(msg.sender, amount);

        emit Claimed(account, amount);
    }

    function vestedAmount(address beneficiary) external view returns (uint256) {
        return
            _vestedAmount(
                vestings[beneficiary].totalAmount,
                vestings[beneficiary].released
            );
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been released yet.
     */
    function _vestedAmount(uint256 totalAmount, uint256 released)
        internal
        view
        returns (uint256)
    {
        uint256 _startTimestamp = startTimestamp;
        uint256 _duration = durationInSeconds;
        uint256 blockTimestamp = block.timestamp;

        if (blockTimestamp < _startTimestamp) {
            return 0;
        }

        uint256 elapsedTime = blockTimestamp - _startTimestamp;
        uint256 unreleased;

        // If over vesting duration, all tokens vested
        if (elapsedTime >= _duration) {
            unreleased = totalAmount;
        } else {
            unreleased = (totalAmount * elapsedTime) / _duration;
        }

        return unreleased - released;
    }
}
