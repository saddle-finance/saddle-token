// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title Vesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract Vesting is Initializable {
    using SafeERC20 for IERC20;

    event Released(uint256 amount);
    event Initialized(address beneficiary, address governance, uint128 cliff, uint128 duration);
    event SetBeneficiary(address beneficiary);
    event SetGovernance(address governance);

    // beneficiary of tokens after they are released
    address public beneficiary;
    IERC20 public token;

    uint256 public cliffInSeconds;
    uint256 public durationInSeconds;
    uint256 public startTimestamp;
    uint256 public released;
    address public governance;
    address public pendingGovernance;

    /**
     * @dev Sets the governance to msg.sender on deploying this contract. This prevents others from
     * initializing the logic contract.
     */
    constructor() public {
        governance = msg.sender;
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
        uint128 _cliffInSeconds,
        uint128 _durationInSeconds,
        address _governance
    ) public initializer {
        require(governance == address(0), "cannot initialize logic contract");
        require(_beneficiary != address(0), "beneficiary cannot be empty");
        require(_governance != address(0), "governance cannot be empty");
        require(_cliffInSeconds <= _durationInSeconds, "cliff is greater than duration");

        token = IERC20(_token);
        beneficiary = _beneficiary;
        durationInSeconds = _durationInSeconds;
        cliffInSeconds = _cliffInSeconds;
        startTimestamp = block.timestamp;
        governance = _governance;

        emit Initialized(_beneficiary, _governance, _cliffInSeconds, _durationInSeconds);
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "only governance can perform this action");
        _;
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() external {
        uint256 vested = vestedAmount();
        require(vested > 0, "No tokens to release");

        released = released + vested;
        token.safeTransfer(beneficiary, vested);

        emit Released(vested);
    }

    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
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

            uint256 vested = totalBalance * elapsedTime / durationInSeconds;
            uint256 unreleased = vested - released;

            // currentBalance can be 0 in case of vesting being revoked earlier.
            return Math.min(currentBalance, unreleased);
        }
    }

    function changeBeneficiary(address newBeneficiary) public onlyGovernance {
        beneficiary = newBeneficiary;
        emit SetBeneficiary(newBeneficiary);
    }

    function changeGovernance(address newGovernance) public onlyGovernance {
        require(newGovernance != address(0), "governance cannot be empty");
        pendingGovernance = newGovernance;
    }

    function acceptGovernance() public {
        require(msg.sender == pendingGovernance, "only pendingGovernance can accept this role");
        pendingGovernance = address(0);
        governance = msg.sender;
        emit SetGovernance(msg.sender);
    }
}