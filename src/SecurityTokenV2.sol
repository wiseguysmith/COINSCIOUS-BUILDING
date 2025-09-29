// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IComplianceRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title SecurityTokenV2
 * @notice Upgraded ERC-1400-lite partitioned security token with UUPS upgradeability
 * @dev Supports REG_D and REG_S partitions with on-chain compliance validation
 * @dev Includes new roles: MINTER_ROLE, BURNER_ROLE, TREASURY_ROLE, ORACLE_ROLE
 */
contract SecurityTokenV2 is Ownable, AccessControl, ReentrancyGuard, Pausable, UUPSUpgradeable {
    // Partition constants
    bytes32 public constant REG_D = keccak256("REG_D");
    bytes32 public constant REG_S = keccak256("REG_S");
    
    // Token details
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    
    // Access control roles
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
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
    
    // New events for V2
    event TokensBurned(
        bytes32 indexed partition,
        address indexed from,
        uint256 amount,
        string reason
    );
    
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    // Reason codes (local for event emission)
    bytes32 private constant ERR_UNKNOWN_PARTITION = keccak256("ERR_UNKNOWN_PARTITION");
    bytes32 private constant ERR_PAUSED = keccak256("ERR_PAUSED");
    bytes32 private constant ERR_COMPLIANCE_PAUSED = keccak256("ERR_COMPLIANCE_PAUSED");
    bytes32 private constant ERR_FROZEN = keccak256("ERR_FROZEN");
    bytes32 private constant ERR_INSUFFICIENT_BALANCE = keccak256("ERR_INSUFFICIENT_BALANCE");

    // Modifiers
    modifier onlyController() {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "SecurityToken: caller is not controller");
        _;
    }
    
    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "SecurityToken: caller is not minter");
        _;
    }
    
    modifier onlyBurner() {
        require(hasRole(BURNER_ROLE, msg.sender), "SecurityToken: caller is not burner");
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
     * @notice Mint tokens to a specific partition (MINTER_ROLE)
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
    ) external onlyMinter {
        require(to != address(0), "SecurityToken: cannot mint to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        
        if (paused()) {
            emit ComplianceCheck(address(0), to, partition, ERR_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.globalCompliancePaused()) {
            emit ComplianceCheck(address(0), to, partition, ERR_COMPLIANCE_PAUSED, 0, false);
            revert("COMPLIANCE_PAUSED");
        }
        
        // Check compliance before minting
        (bool passed, bytes32 reasonCode, uint64 lockupUntil) = complianceRegistry.checkTransfer(
            address(0),
            to,
            partition
        );
        
        if (!passed) {
            emit ComplianceCheck(address(0), to, partition, reasonCode, lockupUntil, false);
            revert("COMPLIANCE_FAILED");
        }
        
        balanceOfByPartition[to][partition] += amount;
        totalSupplyByPartition[partition] += amount;
        
        emit IssuedByPartition(partition, to, amount, data);
        emit ComplianceCheck(address(0), to, partition, reasonCode, lockupUntil, true);
    }
    
    /**
     * @notice Burn tokens from a specific partition (BURNER_ROLE)
     * @param partition Target partition (REG_D or REG_S)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnByPartition(
        bytes32 partition,
        address from,
        uint256 amount
    ) external onlyBurner {
        require(from != address(0), "SecurityToken: cannot burn from zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        require(balanceOfByPartition[from][partition] >= amount, "SecurityToken: insufficient balance");
        
        balanceOfByPartition[from][partition] -= amount;
        totalSupplyByPartition[partition] -= amount;
        
        emit TokensBurned(partition, from, amount, "Burned by burner role");
    }
    
    /**
     * @notice Transfer tokens between partitions
     * @param fromPartition Source partition
     * @param toPartition Destination partition
     * @param to Recipient address
     * @param amount Amount to transfer
     * @param data Additional data
     */
    function transferByPartition(
        bytes32 fromPartition,
        bytes32 toPartition,
        address to,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant {
        require(to != address(0), "SecurityToken: cannot transfer to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        require(balanceOfByPartition[msg.sender][fromPartition] >= amount, "SecurityToken: insufficient balance");
        
        if (paused()) {
            emit ComplianceCheck(msg.sender, to, toPartition, ERR_PAUSED, 0, false);
            revert("PAUSED");
        }
        if (complianceRegistry.globalCompliancePaused()) {
            emit ComplianceCheck(msg.sender, to, toPartition, ERR_COMPLIANCE_PAUSED, 0, false);
            revert("COMPLIANCE_PAUSED");
        }
        
        // Check compliance for destination
        (bool passed, bytes32 reasonCode, uint64 lockupUntil) = complianceRegistry.checkTransfer(
            msg.sender,
            to,
            toPartition
        );
        
        if (!passed) {
            emit ComplianceCheck(msg.sender, to, toPartition, reasonCode, lockupUntil, false);
            revert("COMPLIANCE_FAILED");
        }
        
        // Check if from is frozen
        if (complianceRegistry.isFrozen(msg.sender)) {
            emit ComplianceCheck(msg.sender, to, toPartition, ERR_FROZEN, 0, false);
            revert("FROZEN");
        }
        
        balanceOfByPartition[msg.sender][fromPartition] -= amount;
        balanceOfByPartition[to][toPartition] += amount;
        
        emit TransferredByPartition(fromPartition, msg.sender, to, amount, data, bytes32(0));
        emit ComplianceCheck(msg.sender, to, toPartition, reasonCode, lockupUntil, true);
    }
    
    /**
     * @notice Force transfer tokens (CONTROLLER_ROLE only)
     * @param fromPartition Source partition
     * @param toPartition Destination partition
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     * @param reasonCode Reason for force transfer
     * @param reasonNote Human-readable reason
     */
    function forceTransferByPartition(
        bytes32 fromPartition,
        bytes32 toPartition,
        address from,
        address to,
        uint256 amount,
        bytes32 reasonCode,
        string calldata reasonNote
    ) external onlyController nonReentrant {
        require(from != address(0), "SecurityToken: cannot transfer from zero address");
        require(to != address(0), "SecurityToken: cannot transfer to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        require(balanceOfByPartition[from][fromPartition] >= amount, "SecurityToken: insufficient balance");
        
        balanceOfByPartition[from][fromPartition] -= amount;
        balanceOfByPartition[to][toPartition] += amount;
        
        emit ForceTransfer(fromPartition, from, to, amount, reasonCode, reasonNote);
    }
    
    /**
     * @notice Get balance for a specific partition
     * @param partition Partition to query
     * @param account Account to query
     * @return Balance amount
     */
    function balanceOfByPartition(bytes32 partition, address account) external view returns (uint256) {
        return balanceOfByPartition[account][partition];
    }
    
    /**
     * @notice Get total supply for a specific partition
     * @param partition Partition to query
     * @return Total supply amount
     */
    function totalSupplyByPartition(bytes32 partition) external view returns (uint256) {
        return totalSupplyByPartition[partition];
    }
    
    /**
     * @notice Get total supply across all partitions
     * @return Total supply amount
     */
    function totalSupply() external view returns (uint256) {
        return totalSupplyByPartition[REG_D] + totalSupplyByPartition[REG_S];
    }
    
    /**
     * @notice Get total balance for an account across all partitions
     * @param account Account to query
     * @return Total balance amount
     */
    function balanceOf(address account) external view returns (uint256) {
        return balanceOfByPartition[account][REG_D] + balanceOfByPartition[account][REG_S];
    }
    
    /**
     * @notice Propose new controller
     * @param newController Address of proposed controller
     */
    function proposeController(address newController) external onlyOwner {
        require(newController != address(0), "SecurityToken: controller cannot be zero");
        require(newController != controller, "SecurityToken: same controller");
        
        pendingController = newController;
        emit ControllerProposed(newController);
    }
    
    /**
     * @notice Accept controller role (only pending controller can call)
     */
    function acceptControllerRole() external {
        require(msg.sender == pendingController, "SecurityToken: not pending controller");
        
        address oldController = controller;
        controller = pendingController;
        pendingController = address(0);
        
        _grantRole(CONTROLLER_ROLE, controller);
        _revokeRole(CONTROLLER_ROLE, oldController);
        
        emit ControllerChanged(oldController, controller);
    }
    
    /**
     * @notice Update compliance registry
     * @param newRegistry Address of new registry
     */
    function updateComplianceRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "SecurityToken: registry cannot be zero");
        
        address oldRegistry = address(complianceRegistry);
        complianceRegistry = IComplianceRegistry(newRegistry);
        
        emit RegistryChanged(oldRegistry, newRegistry);
    }
    
    /**
     * @notice Pause all token operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause all token operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Grant role to account
     * @param role Role to grant
     * @param account Account to grant role to
     */
    function grantRole(bytes32 role, address account) public override onlyOwner {
        _grantRole(role, account);
        emit RoleGranted(role, account, msg.sender);
    }
    
    /**
     * @notice Revoke role from account
     * @param role Role to revoke
     * @param account Account to revoke role from
     */
    function revokeRole(bytes32 role, address account) public override onlyOwner {
        _revokeRole(role, account);
        emit RoleRevoked(role, account, msg.sender);
    }
    
    /**
     * @notice Authorize upgrade (UUPS)
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Additional authorization logic can be added here
    }
    
    /**
     * @notice Get current implementation version
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
