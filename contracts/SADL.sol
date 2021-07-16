// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";
import "./Vesting.sol";

contract SADL is ERC20Permit, Pausable {
    using SafeERC20 for IERC20;

    // Token max supply is 1,000,000,000 * 1e18 = 1e27
    uint256 constant MAX_SUPPLY = 1000000000 ether;
    uint256 public immutable canUnpauseAfter;
    address public governance;
    address public pendingGovernance;
    mapping(address => bool) public allowedTransferee;

    event Allowed(address target);
    event Disallowed(address target);

    struct Recipient {
        address to;
        uint256 amount;
        uint128 cliffPeriod;
        uint128 durationPeriod;
    }

    /**
     * @dev Initializes SADL token with specified governance address and recipients. For vesting
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
    ) ERC20("Saddle", "SADL") ERC20Permit("Saddle") public {
        governance = _governance;
        allowedTransferee[_governance] = true;

        for (uint256 i = 0; i < _recipients.length; i++) {
            address to = _recipients[i].to;
            uint256 amount = _recipients[i].amount;
            if (_recipients[i].cliffPeriod > 0 || _recipients[i].durationPeriod > 0) {
                // If the recipients require vesting, deploy a clone of Vesting.sol
                Vesting vestingContract = Vesting(Clones.clone(_vestingContractTarget));
                _mint(address(vestingContract), amount);
                vestingContract.initialize(
                    address(this),
                    to,
                    _recipients[i].cliffPeriod,
                    _recipients[i].durationPeriod,
                    _governance
                );
                allowedTransferee[address(vestingContract)] = true;
            } else {
                _mint(to, amount);
                allowedTransferee[to] = true;
            }
        }

        canUnpauseAfter = block.timestamp + _pausePeriod;
        _pause();

        // Check all tokens are minted after deployment
        require(totalSupply() == MAX_SUPPLY, "SADL: incorrect distribution");
    }

    modifier onlyGovernance() {
        require(_msgSender() == governance, "SADL: only governance can perform this action");
        _;
    }

    function changeGovernance(address newGovernance) public onlyGovernance {
        require(newGovernance != address(0), "SADL: governance cannot be empty");
        pendingGovernance = newGovernance;
    }

    function acceptGovernance() public {
        require(msg.sender == pendingGovernance, "SADL: only pendingGovernance can accept this role");
        pendingGovernance = address(0);
        governance = msg.sender;
    }

    function changeTransferability(bool decision) public onlyGovernance {
        require(block.timestamp > canUnpauseAfter, "SADL: cannot change transferability yet");
        if (decision) {
            _unpause();
        } else {
            _pause();
        }
    }

    function addToAllowedList(address[] memory target) public onlyGovernance {
        for (uint256 i = 0; i < target.length; i++) {
            allowedTransferee[target[i]] = true;
            emit Allowed(target[i]);
        }
    }

    function removeFromAllowedList(address[] memory target) public onlyGovernance {
        for (uint256 i = 0; i < target.length; i++) {
            allowedTransferee[target[i]] = false;
            emit Disallowed(target[i]);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused() || allowedTransferee[from] || allowedTransferee[to], "SADL: paused");
        require(to != address(this), "SADL: invalid recipient");
    }

    /// @dev Method to claim junk and accidentally sent tokens
    function rescueTokens(
        IERC20 _token,
        address payable _to,
        uint256 _balance
    ) external onlyGovernance {
        require(_to != address(0), "SADL: can not send to zero address");

        if (_token == IERC20(address(0))) {
            // for Ether
            uint256 totalBalance = address(this).balance;
            uint256 balance = _balance == 0 ? totalBalance : Math.min(totalBalance, _balance);
            _to.transfer(balance);
        } else {
            // any other erc20
            uint256 totalBalance = _token.balanceOf(address(this));
            uint256 balance = _balance == 0 ? totalBalance : Math.min(totalBalance, _balance);
            require(balance > 0, "SADL: trying to send 0 balance");
            _token.safeTransfer(_to, balance);
        }
    }
}
