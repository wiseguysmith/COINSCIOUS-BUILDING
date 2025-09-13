// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IComplianceRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title SecurityToken
 * @notice Minimal ERC-1400-lite partitioned security token with compliance enforcement
 * @dev Supports REG_D and REG_S partitions with on-chain compliance validation
 */
contract SecurityToken is Ownable, AccessControl, ReentrancyGuard, Pausable {
    // Partition constants
    bytes32 public constant REG_D = keccak256("REG_D");
    bytes32 public constant REG_S = keccak256("REG_S");
    
    // Token details
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    
    // Access control
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    
    // State variables
    IComplianceRegistry public complianceRegistry;
    address public controller;
    address public pendingController;
    mapping(bytes32 => uint256) public totalSupplyByPartition;
    mapping(address => mapping(bytes32 => uint256)) public balanceOfByPartition;
    
    // Events
    event IssuedByPartition(
        bytes32 indexed partition,
        address indexed to,
        uint256 amount,
        bytes data
    );
    
    event TransferredByPartition(
        bytes32 indexed partition,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes32 operatorData
    );
    
    event ForceTransfer(
        bytes32 indexed partition,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 reasonCode,
        string reasonNote
    );
    
    event ComplianceCheck(
        address indexed from,
        address indexed to,
        bytes32 indexed partition,
        bytes32 reasonCode,
        uint64 lockupUntil,
        bool passed
    );
    
    event ControllerChanged(address indexed oldController, address indexed newController);
    event RegistryChanged(address indexed oldRegistry, address indexed newRegistry);
    event ControllerProposed(address indexed proposedController);
    
    // Reason codes (local for event emission)
    bytes32 private constant ERR_UNKNOWN_PARTITION = keccak256("ERR_UNKNOWN_PARTITION");
    bytes32 private constant ERR_PAUSED = keccak256("ERR_PAUSED");
    bytes32 private constant ERR_COMPLIANCE_PAUSED = keccak256("ERR_COMPLIANCE_PAUSED");
    bytes32 private constant ERR_FROZEN = keccak256("ERR_FROZEN");

    // Modifiers
    modifier onlyController() {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "SecurityToken: caller is not controller");
        _;
    }
    
    /**
     * @notice Constructor for proxy compatibility
     */
    constructor() Ownable(msg.sender) {
        // Empty constructor for proxy compatibility
    }
    
    /**
     * @notice Initialize the token (for proxy deployment)
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _owner Token owner
     * @param _controller Controller address
     * @param _registry Compliance registry address
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _controller,
        address _registry
    ) external {
        require(bytes(name).length == 0, "SecurityToken: already initialized");
        require(_owner != address(0), "SecurityToken: owner cannot be zero");
        require(_controller != address(0), "SecurityToken: controller cannot be zero");
        require(_registry != address(0), "SecurityToken: registry cannot be zero");
        
        name = _name;
        symbol = _symbol;
        
        _transferOwnership(_owner);
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(CONTROLLER_ROLE, _controller);
        
        controller = _controller;
        complianceRegistry = IComplianceRegistry(_registry);
        
        emit ControllerChanged(address(0), _controller);
        emit RegistryChanged(address(0), _registry);
    }
    
    /**
     * @notice Mint tokens to a specific partition
     * @param partition Target partition (REG_D or REG_S)
     * @param to Recipient address
     * @param amount Amount to mint
     * @param data Additional data
     */
    function mintByPartition(
        bytes32 partition,
        address to,
        uint256 amount,
        bytes calldata data
    ) external onlyController {
        require(to != address(0), "SecurityToken: cannot mint to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        
        if (paused()) {
            emit ComplianceCheck(address(0), to, partition, ERR_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.globalCompliancePaused()) {
            emit ComplianceCheck(address(0), to, partition, ERR_COMPLIANCE_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.isFrozen(to)) {
            emit ComplianceCheck(address(0), to, partition, ERR_FROZEN, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        
        if (partition != REG_D && partition != REG_S) {
            emit ComplianceCheck(address(0), to, partition, ERR_UNKNOWN_PARTITION, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        
        // Check compliance for minting
        (bool ok, bytes32 reasonCode, uint64 lockupUntil) = complianceRegistry.isTransferAllowed(
            address(0), // from (minting)
            to,
            partition,
            amount
        );
        
        emit ComplianceCheck(address(0), to, partition, reasonCode, lockupUntil, ok);
        require(ok, "COMPLIANCE_VIOLATION");
        
        // Update state
        balanceOfByPartition[to][partition] += amount;
        totalSupplyByPartition[partition] += amount;
        
        emit IssuedByPartition(partition, to, amount, data);
    }
    
    /**
     * @notice Burn tokens from a specific partition
     * @param partition Target partition (REG_D or REG_S)
     * @param from Address to burn from
     * @param amount Amount to burn
     * @param data Additional data
     */
    function burnByPartition(
        bytes32 partition,
        address from,
        uint256 amount,
        bytes calldata data
    ) external onlyController {
        require(from != address(0), "SecurityToken: cannot burn from zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        
        if (paused()) {
            emit ComplianceCheck(from, address(0), partition, ERR_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.globalCompliancePaused()) {
            emit ComplianceCheck(from, address(0), partition, ERR_COMPLIANCE_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.isFrozen(from)) {
            emit ComplianceCheck(from, address(0), partition, ERR_FROZEN, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        
        if (partition != REG_D && partition != REG_S) {
            emit ComplianceCheck(from, address(0), partition, ERR_UNKNOWN_PARTITION, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        require(balanceOfByPartition[from][partition] >= amount, "SecurityToken: insufficient balance");
        
        // Update state
        balanceOfByPartition[from][partition] -= amount;
        totalSupplyByPartition[partition] -= amount;
        
        emit TransferredByPartition(partition, from, address(0), amount, data, "");
    }
    
    /**
     * @notice Transfer tokens between partitions
     * @param partition Target partition (REG_D or REG_S)
     * @param to Recipient address
     * @param amount Amount to transfer
     * @param data Additional data
     * @return operatorData Hash of the transfer operation
     */
    function transferByPartition(
        bytes32 partition,
        address to,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant returns (bytes32) {
        require(to != address(0), "SecurityToken: cannot transfer to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        require(balanceOfByPartition[msg.sender][partition] >= amount, "SecurityToken: insufficient balance");
        
        if (paused()) {
            emit ComplianceCheck(msg.sender, to, partition, ERR_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.globalCompliancePaused()) {
            emit ComplianceCheck(msg.sender, to, partition, ERR_COMPLIANCE_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (
            complianceRegistry.isFrozen(msg.sender) ||
            complianceRegistry.isFrozen(to)
        ) {
            emit ComplianceCheck(msg.sender, to, partition, ERR_FROZEN, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        
        if (partition != REG_D && partition != REG_S) {
            emit ComplianceCheck(msg.sender, to, partition, ERR_UNKNOWN_PARTITION, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        
        // Check compliance for transfer
        (bool ok, bytes32 reasonCode, uint64 lockupUntil) = complianceRegistry.isTransferAllowed(
            msg.sender,
            to,
            partition,
            amount
        );
        
        emit ComplianceCheck(msg.sender, to, partition, reasonCode, lockupUntil, ok);
        require(ok, "COMPLIANCE_VIOLATION");
        
        // Update state
        balanceOfByPartition[msg.sender][partition] -= amount;
        balanceOfByPartition[to][partition] += amount;
        
        bytes32 operatorData = keccak256(abi.encodePacked(msg.sender, to, partition, amount, block.timestamp));
        
        emit TransferredByPartition(partition, msg.sender, to, amount, data, operatorData);
        
        return operatorData;
    }
    
    /**
     * @notice Force transfer tokens (emergency/admin use only)
     * @param partition Target partition (REG_D or REG_S)
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     * @param reasonCode Machine-readable reason code (bytes32 ERR_*)
     * @param reasonNote Human-readable note
     */
    function forceTransfer(
        bytes32 partition,
        address from,
        address to,
        uint256 amount,
        bytes32 reasonCode,
        string calldata reasonNote
    ) external onlyController {
        require(from != address(0), "SecurityToken: cannot transfer from zero address");
        require(to != address(0), "SecurityToken: cannot transfer to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        require(balanceOfByPartition[from][partition] >= amount, "SecurityToken: insufficient balance");
        require(reasonCode != bytes32(0), "SecurityToken: reasonCode required");
        require(bytes(reasonNote).length > 0, "SecurityToken: reasonNote required");
        
        if (paused()) {
            emit ComplianceCheck(from, to, partition, ERR_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.globalCompliancePaused()) {
            emit ComplianceCheck(from, to, partition, ERR_COMPLIANCE_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (
            complianceRegistry.isFrozen(from) ||
            complianceRegistry.isFrozen(to)
        ) {
            emit ComplianceCheck(from, to, partition, ERR_FROZEN, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        
        if (partition != REG_D && partition != REG_S) {
            emit ComplianceCheck(from, to, partition, ERR_UNKNOWN_PARTITION, 0, false);
            revert("COMPLIANCE_VIOLATION");
        }
        // For forceTransfer we may bypass policy but must emit a failing ComplianceCheck
        (bool okFT, bytes32 reasonCodeFT, uint64 lockupUntilFT) = complianceRegistry.isTransferAllowed(
            address(0), // bypass source checks
            to,
            partition,
            amount
        );
        emit ComplianceCheck(from, to, partition, reasonCodeFT, lockupUntilFT, okFT);
        
        // Update state
        balanceOfByPartition[from][partition] -= amount;
        balanceOfByPartition[to][partition] += amount;
        
        emit ForceTransfer(partition, from, to, amount, reasonCode, reasonNote);
    }

    // Pause controls (owner/timelock)
    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Set the compliance registry
     * @param newRegistry New compliance registry address
     */
    function setRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "SecurityToken: registry cannot be zero address");
        require(newRegistry != address(complianceRegistry), "SecurityToken: registry already set");
        
        address oldRegistry = address(complianceRegistry);
        complianceRegistry = IComplianceRegistry(newRegistry);
        
        emit RegistryChanged(oldRegistry, newRegistry);
    }
    
    /**
     * @notice Set the controller address
     * @param newController New controller address
     */
    function setController(address newController) external onlyOwner {
        require(newController != address(0), "SecurityToken: controller cannot be zero address");
        require(newController != msg.sender, "SecurityToken: cannot set self as controller");
        
        address oldController = controller;
        _revokeRole(CONTROLLER_ROLE, oldController);
        _grantRole(CONTROLLER_ROLE, newController);
        controller = newController;
        
        emit ControllerChanged(oldController, newController);
    }

    /**
     * @notice Propose a new controller (two-step handover)
     * @param newController Proposed controller address
     */
    function proposeController(address newController) external onlyOwner {
        require(newController != address(0), "SecurityToken: controller cannot be zero address");
        pendingController = newController;
        emit ControllerProposed(newController);
    }

    /**
     * @notice Accept controller role (must be the pending controller)
     */
    function acceptController() external {
        require(msg.sender == pendingController, "SecurityToken: not pending controller");
        address oldController = controller;
        _revokeRole(CONTROLLER_ROLE, oldController);
        _grantRole(CONTROLLER_ROLE, msg.sender);
        controller = msg.sender;
        pendingController = address(0);
        emit ControllerChanged(oldController, controller);
    }

    /**
     * @notice Rescue ERC20 tokens accidentally sent to this contract
     * @param token ERC20 token address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "SecurityToken: invalid recipient");
        IERC20(token).transfer(to, amount);
    }

    /**
     * @notice Rescue ERC721 tokens accidentally sent to this contract
     * @param token ERC721 token address
     * @param to Recipient address
     * @param tokenId Token ID to transfer
     */
    function rescueERC721(address token, address to, uint256 tokenId) external onlyOwner {
        require(to != address(0), "SecurityToken: invalid recipient");
        IERC721(token).transferFrom(address(this), to, tokenId);
    }
    
    /**
     * @notice Get total supply across all partitions
     * @return Total supply
     */
    function totalSupply() external view returns (uint256) {
        return totalSupplyByPartition[REG_D] + totalSupplyByPartition[REG_S];
    }
    
    /**
     * @notice Get balance across all partitions for an address
     * @param account Account address
     * @return Total balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return balanceOfByPartition[account][REG_D] + balanceOfByPartition[account][REG_S];
    }
    
    /**
     * @notice Check if an address has a specific role
     * @param role Role to check
     * @param account Account to check
     * @return True if account has role
     */
    function hasRole(bytes32 role, address account) public view override returns (bool) {
        return super.hasRole(role, account);
    }
}
