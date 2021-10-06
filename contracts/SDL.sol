// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";
import "./Vesting.sol";
import "./SimpleGovernance.sol";

/**
 * @title Saddle DAO token
 * @notice A token that is deployed with fixed amount and appropriate vesting contracts.
 * Transfer is blocked for a period of time until the governance can toggle the transferability.
 */
contract SDL is ERC20Permit, Pausable, SimpleGovernance {
    using SafeERC20 for IERC20;

    // Token max supply is 1,000,000,000 * 1e18 = 1e27
    uint256 constant MAX_SUPPLY = 1e9 ether;
    uint256 public immutable govCanUnpauseAfter;
    uint256 public immutable anyoneCanUnpauseAfter;
    mapping(address => bool) public allowedTransferee;

    event Allowed(address target);
    event Disallowed(address target);

    struct Recipient {
        address to;
        uint256 amount;
        uint256 cliffPeriod;
        uint256 durationPeriod;
    }

    /**
     * @dev Initializes SDL token with specified governance address and recipients. For vesting
     * durations and amounts, please refer to our documentation on token distribution schedule.
     * @param _governance address of the governance who will own this contract
     * @param _pausePeriod time in seconds until since deployment this token can be unpaused by the governance
     * @param _recipients recipients of the token at deployment. Addresses that are subject to vesting are vested according
     * to the token distribution schedule.
     * @param _vestingContractTarget logic contract of Vesting.sol to use for cloning
     */
    constructor(
        address _governance,
        uint256 _pausePeriod,
        Recipient[] memory _recipients,
        address _vestingContractTarget
    ) public ERC20("Saddle DAO", "SDL") ERC20Permit("Saddle DAO") {
        require(_governance != address(0), "SDL: governance cannot be empty");
        governance = _governance;
        allowedTransferee[_governance] = true;

        for (uint256 i = 0; i < _recipients.length; i++) {
            address to = _recipients[i].to;
            if (_recipients[i].durationPeriod != 0) {
                // If the recipients require vesting, deploy a clone of Vesting.sol
                Vesting vestingContract = Vesting(
                    Clones.clone(_vestingContractTarget)
                );
                // Initializes clone contracts
                vestingContract.initialize(
                    address(this),
                    to,
                    _recipients[i].cliffPeriod,
                    _recipients[i].durationPeriod
                );
                to = address(vestingContract);
            }
            _mint(to, _recipients[i].amount);
            allowedTransferee[to] = true;
            emit Allowed(to);
        }

        govCanUnpauseAfter = block.timestamp + _pausePeriod;
        anyoneCanUnpauseAfter = block.timestamp + 52 weeks;
        if (_pausePeriod > 0) {
            _pause();
        }

        // Check all tokens are minted after deployment
        require(totalSupply() == MAX_SUPPLY, "SDL: incorrect mint amount");
        emit SetGovernance(_governance);
    }

    /**
     * @notice Changes the transferability of this token.
     * @dev When the transfer is not enabled, only those in allowedTransferee array can
     * transfer this token.
     */
    function enableTransfer() external {
        require(paused(), "SDL: transfer is enabled");
        uint256 unpauseAfter = msg.sender == governance
            ? govCanUnpauseAfter
            : anyoneCanUnpauseAfter;
        require(
            block.timestamp > unpauseAfter,
            "SDL: cannot enable transfer yet"
        );
        _unpause();
    }

    /**
     * @notice Add the given addresses to the list of allowed addresses that can transfer during paused period.
     * @param targets Array of addresses to add
     */
    function addToAllowedList(address[] memory targets)
        external
        onlyGovernance
    {
        for (uint256 i = 0; i < targets.length; i++) {
            allowedTransferee[targets[i]] = true;
            emit Allowed(targets[i]);
        }
    }

    /**
     * @notice Remove the given addresses from the list of allowed addresses that can transfer during paused period.
     * @param targets Array of addresses to remove
     */
    function removeFromAllowedList(address[] memory targets)
        external
        onlyGovernance
    {
        for (uint256 i = 0; i < targets.length; i++) {
            allowedTransferee[targets[i]] = false;
            emit Disallowed(targets[i]);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        require(
            !paused() || allowedTransferee[from] || allowedTransferee[to],
            "SDL: paused"
        );
        require(to != address(this), "SDL: invalid recipient");
    }

    /**
     * @notice Transfers any stuck tokens or ether out to the given destination.
     * @dev Method to claim junk and accidentally sent tokens.
     * @param token Address of the ERC20 token to transfer out. Set to address(0) to transfer ether instead.
     * @param to Destination address that will receive the tokens.
     * @param balance Amount to transfer out. Set to 0 to select all available amount.
     */
    function rescueTokens(
        IERC20 token,
        address payable to,
        uint256 balance
    ) external onlyGovernance {
        require(to != address(0), "SDL: invalid recipient");

        if (token == IERC20(address(0))) {
            // for Ether
            uint256 totalBalance = address(this).balance;
            balance = balance == 0
                ? totalBalance
                : Math.min(totalBalance, balance);
            // slither-disable-next-line arbitrary-send
            (bool success, ) = to.call{value: balance}("");
            require(success, "SDL: ETH transfer failed");
        } else {
            // any other erc20
            uint256 totalBalance = token.balanceOf(address(this));
            balance = balance == 0
                ? totalBalance
                : Math.min(totalBalance, balance);
            require(balance > 0, "SDL: trying to send 0 balance");
            token.safeTransfer(to, balance);
        }
    }
}
