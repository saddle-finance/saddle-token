// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";
import "./Vesting.sol";

contract SADDLE is ERC20Permit, Pausable {
    using SafeERC20 for IERC20;

    // Token max supply is 1,000,000,000 * 1e18 = 1e27
    uint256 constant MAX_SUPPLY = 1e9 ether;
    uint256 public immutable canUnpauseAfter;
    address public governance;
    address public pendingGovernance;
    mapping(address => bool) public allowedTransferee;

    event Allowed(address target);
    event Disallowed(address target);
    event SetGovernance(address governance);

    struct Recipient {
        address to;
        uint256 amount;
        uint256 cliffPeriod;
        uint256 durationPeriod;
    }

    /**
     * @dev Initializes SADDLE token with specified governance address and recipients. For vesting
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
    ) public ERC20("Saddle", "SADDLE") ERC20Permit("Saddle") {
        require(
            _governance != address(0),
            "SADDLE: governance cannot be empty"
        );
        governance = _governance;
        allowedTransferee[_governance] = true;

        for (uint256 i = 0; i < _recipients.length; i++) {
            address to = _recipients[i].to;
            if (_recipients[i].durationPeriod > 0) {
                // If the recipients require vesting, deploy a clone of Vesting.sol
                Vesting vestingContract = Vesting(
                    Clones.clone(_vestingContractTarget)
                );
                vestingContract.initialize(
                    address(this),
                    to,
                    _recipients[i].cliffPeriod,
                    _recipients[i].durationPeriod,
                    _governance
                );
                to = address(vestingContract);
            }
            _mint(to, _recipients[i].amount);
            allowedTransferee[to] = true;
            emit Allowed(to);
        }

        canUnpauseAfter = block.timestamp + _pausePeriod;
        _pause();

        // Check all tokens are minted after deployment
        require(totalSupply() == MAX_SUPPLY, "SADDLE: incorrect distribution");
        emit SetGovernance(_governance);
    }

    modifier onlyGovernance() {
        require(
            _msgSender() == governance,
            "SADDLE: only governance can perform this action"
        );
        _;
    }

    function changeGovernance(address newGovernance) external onlyGovernance {
        require(
            newGovernance != address(0),
            "SADDLE: governance cannot be empty"
        );
        pendingGovernance = newGovernance;
    }

    function acceptGovernance() external {
        address _pendingGovernance = pendingGovernance;
        require(
            _pendingGovernance != address(0),
            "SADDLE: changeGovernance must be called first"
        );
        require(
            msg.sender == _pendingGovernance,
            "SADDLE: only pendingGovernance can accept this role"
        );
        pendingGovernance = address(0);
        governance = msg.sender;
        emit SetGovernance(msg.sender);
    }

    function changeTransferability(bool decision) external onlyGovernance {
        require(
            block.timestamp > canUnpauseAfter,
            "SADDLE: cannot change transferability yet"
        );
        if (decision) {
            _unpause();
        } else {
            _pause();
        }
    }

    function addToAllowedList(address[] memory targets)
        external
        onlyGovernance
    {
        for (uint256 i = 0; i < targets.length; i++) {
            allowedTransferee[targets[i]] = true;
            emit Allowed(targets[i]);
        }
    }

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
            "SADDLE: paused"
        );
        require(to != address(this), "SADDLE: invalid recipient");
    }

    /// @dev Method to claim junk and accidentally sent tokens
    function rescueTokens(
        IERC20 token,
        address payable to,
        uint256 balance
    ) external onlyGovernance {
        require(to != address(0), "SADDLE: can not send to zero address");

        if (token == IERC20(address(0))) {
            // for Ether
            uint256 totalBalance = address(this).balance;
            balance = balance == 0
                ? totalBalance
                : Math.min(totalBalance, balance);
            // slither-disable-next-line arbitrary-send
            (bool success, ) = to.call{value: balance}("");
            require(success, "ETH_TRANSFER_FAILED");
        } else {
            // any other erc20
            uint256 totalBalance = token.balanceOf(address(this));
            balance = balance == 0
                ? totalBalance
                : Math.min(totalBalance, balance);
            require(balance > 0, "SADDLE: trying to send 0 balance");
            token.safeTransfer(to, balance);
        }
    }
}
