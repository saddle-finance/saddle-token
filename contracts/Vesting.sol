// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./SimpleGovernance.sol";

/**
 * @title Vesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract Vesting is Initializable, Context {
    using SafeERC20 for IERC20;

    event Released(uint256 amount);
    event VestingInitialized(
        address beneficiary,
        uint256 cliff,
        uint256 duration
    );
    event SetBeneficiary(address beneficiary);

    // beneficiary of tokens after they are released
    address public beneficiary;
    IERC20 public token;

    uint256 public cliffInSeconds;
    uint256 public durationInSeconds;
    uint256 public startTimestamp;
    uint256 public released;

    /**
     * @dev Sets the beneficiary to _msgSender() on deploying this contract. This prevents others from
     * initializing the logic contract.
     */
    constructor() public {
        beneficiary = _msgSender();
    }

    /**
     * @dev Limits certain functions to be called by governance
     */
    modifier onlyGovernance() {
        require(
            _msgSender() == governance(),
            "only governance can perform this action"
        );
        _;
    }

    /**
     * @dev Initializes a vesting contract that vests its balance of any ERC20 token to the
     * _beneficiary, monthly in a linear fashion until duration has passed. By then all
     * of the balance will have vested.
     * @param _token address of the token that is subject to vesting
     * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param _cliffInSeconds duration in months of the cliff in which tokens will begin to vest
     * @param _durationInSeconds duration in months of the period in which the tokens will vest
     */
    function initialize(
        address _token,
        address _beneficiary,
        uint256 _cliffInSeconds,
        uint256 _durationInSeconds
    ) external initializer {
        require(beneficiary == address(0), "cannot initialize logic contract");
        require(_beneficiary != address(0), "beneficiary cannot be empty");
        require(
            _cliffInSeconds <= _durationInSeconds,
            "cliff is greater than duration"
        );

        token = IERC20(_token);
        beneficiary = _beneficiary;
        durationInSeconds = _durationInSeconds;
        cliffInSeconds = _cliffInSeconds;
        startTimestamp = block.timestamp;

        emit VestingInitialized(
            _beneficiary,
            _cliffInSeconds,
            _durationInSeconds
        );
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() external {
        uint256 vested = vestedAmount();
        require(vested > 0, "No tokens to release");

        released = released + vested;
        emit Released(vested);
        token.safeTransfer(beneficiary, vested);
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been released yet.
     */
    function vestedAmount() public view returns (uint256) {
        uint256 blockTimestamp = block.timestamp;
        if (blockTimestamp < startTimestamp) {
            return 0;
        }

        uint256 elapsedTime = blockTimestamp - startTimestamp;

        if (elapsedTime < cliffInSeconds) {
            return 0;
        }

        // If over vesting duration, all tokens vested
        if (elapsedTime >= durationInSeconds) {
            return token.balanceOf(address(this));
        } else {
            uint256 currentBalance = token.balanceOf(address(this));
            uint256 totalBalance = currentBalance + released;

            uint256 vested = (totalBalance * elapsedTime) / durationInSeconds;
            uint256 unreleased = vested - released;

            // currentBalance can be 0 in case of vesting being revoked earlier.
            return Math.min(currentBalance, unreleased);
        }
    }

    /**
     * @notice Changes beneficiary who receives the vested token.
     * @dev Only governance can call this function. This is to be used in case the target address
     * needs to be updated. If the previous beneficiary did not claim any tokens, the new beneficiary
     * will be able to claim the unclaimed portions of the vested token.
     * @param newBeneficiary new address to become the beneficiary
     */
    function changeBeneficiary(address newBeneficiary) external onlyGovernance {
        require(newBeneficiary != address(0), "beneficiary cannot be empty");
        beneficiary = newBeneficiary;
        emit SetBeneficiary(newBeneficiary);
    }

    /**
     * @notice Governance who owns this contract.
     * @dev Governance of the token contract also owns this vesting contract.
     */
    function governance() public view returns (address) {
        return SimpleGovernance(address(token)).governance();
    }
}
