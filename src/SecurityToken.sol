// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IComplianceRegistry.sol";

/**
 * @title SecurityToken
 * @notice Minimal ERC-1400-lite partitioned security token with compliance enforcement
 * @dev Supports REG_D and REG_S partitions with on-chain compliance validation
 */
contract SecurityToken is Ownable, AccessControl, ReentrancyGuard {
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
        string reason
    );
    
    event ComplianceCheck(
        address indexed from,
        address indexed to,
        bytes32 indexed partition,
        string reason,
        bool passed
    );
    
    event ControllerChanged(address indexed oldController, address indexed newController);
    event RegistryChanged(address indexed oldRegistry, address indexed newRegistry);
    
    // Modifiers
    modifier onlyController() {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "SecurityToken: caller is not controller");
        _;
    }
    
    modifier onlyValidPartition(bytes32 partition) {
        require(partition == REG_D || partition == REG_S, "SecurityToken: invalid partition");
        _;
    }
    
    /**
     * @notice Initialize the security token
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _owner Owner address
     * @param _controller Controller address
     * @param _registry Compliance registry address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _controller,
        address _registry
    ) Ownable(_owner) {
        name = _name;
        symbol = _symbol;
        
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
    ) external onlyController onlyValidPartition(partition) {
        require(to != address(0), "SecurityToken: cannot mint to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        
        // Check compliance for minting
        (bool ok, string memory reason) = complianceRegistry.isTransferAllowed(
            address(0), // from (minting)
            to,
            partition,
            amount
        );
        
        emit ComplianceCheck(address(0), to, partition, reason, ok);
        require(ok, reason);
        
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
    ) external onlyController onlyValidPartition(partition) {
        require(from != address(0), "SecurityToken: cannot burn from zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
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
    ) external onlyValidPartition(partition) nonReentrant returns (bytes32) {
        require(to != address(0), "SecurityToken: cannot transfer to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        require(balanceOfByPartition[msg.sender][partition] >= amount, "SecurityToken: insufficient balance");
        
        // Check compliance for transfer
        (bool ok, string memory reason) = complianceRegistry.isTransferAllowed(
            msg.sender,
            to,
            partition,
            amount
        );
        
        emit ComplianceCheck(msg.sender, to, partition, reason, ok);
        require(ok, reason);
        
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
     * @param reason Reason for force transfer
     */
    function forceTransfer(
        bytes32 partition,
        address from,
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyController onlyValidPartition(partition) {
        require(from != address(0), "SecurityToken: cannot transfer from zero address");
        require(to != address(0), "SecurityToken: cannot transfer to zero address");
        require(amount > 0, "SecurityToken: amount must be positive");
        require(balanceOfByPartition[from][partition] >= amount, "SecurityToken: insufficient balance");
        require(bytes(reason).length > 0, "SecurityToken: reason required");
        
        // Check compliance for destination (but bypass source checks)
        (bool ok, string memory complianceReason) = complianceRegistry.isTransferAllowed(
            address(0), // from (bypass source checks)
            to,
            partition,
            amount
        );
        
        emit ComplianceCheck(from, to, partition, complianceReason, ok);
        require(ok, complianceReason);
        
        // Update state
        balanceOfByPartition[from][partition] -= amount;
        balanceOfByPartition[to][partition] += amount;
        
        emit ForceTransfer(partition, from, to, amount, reason);
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
