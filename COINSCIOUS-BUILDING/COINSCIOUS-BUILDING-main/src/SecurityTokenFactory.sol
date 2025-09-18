// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SecurityToken.sol";

/**
 * @title SecurityTokenFactory
 * @notice Factory for creating SecurityToken clones using EIP-1167 minimal proxy pattern
 * @dev Efficiently deploys new token instances with minimal gas cost
 */
contract SecurityTokenFactory is Ownable {
    // Implementation contract address
    SecurityToken public immutable implementation;
    
    // Array of all deployed tokens
    SecurityToken[] public deployedTokens;
    
    // Mapping from token address to deployment info
    mapping(address => TokenInfo) public tokenInfo;
    
    // Events
    event TokenDeployed(
        address indexed token,
        string name,
        string symbol,
        address indexed owner,
        address indexed controller,
        address registry
    );
    
    struct TokenInfo {
        string name;
        string symbol;
        address owner;
        address controller;
        address registry;
        uint256 deploymentTime;
    }
    
    /**
     * @notice Initialize the factory with implementation contract
     * @param _implementation SecurityToken implementation contract
     */
    constructor(SecurityToken _implementation) Ownable(msg.sender) {
        require(address(_implementation) != address(0), "Factory: implementation cannot be zero");
        implementation = _implementation;
    }
    
    /**
     * @notice Deploy a new SecurityToken clone
     * @param name Token name
     * @param symbol Token symbol
     * @param owner Token owner address
     * @param controller Controller address
     * @param registry Compliance registry address
     * @return token Address of the deployed token
     */
    function deployToken(
        string memory name,
        string memory symbol,
        address owner,
        address controller,
        address registry
    ) external onlyOwner returns (SecurityToken token) {
        require(bytes(name).length > 0, "Factory: name cannot be empty");
        require(bytes(symbol).length > 0, "Factory: symbol cannot be empty");
        require(owner != address(0), "Factory: owner cannot be zero");
        require(controller != address(0), "Factory: controller cannot be zero");
        require(registry != address(0), "Factory: registry cannot be zero");
        
        // Deploy minimal proxy
        bytes memory bytecode = _getBytecode(name, symbol, owner, controller, registry);
        address tokenAddress;
        
        assembly {
            tokenAddress := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        
        require(tokenAddress != address(0), "Factory: deployment failed");
        
        token = SecurityToken(tokenAddress);
        
        // Store deployment info
        tokenInfo[tokenAddress] = TokenInfo({
            name: name,
            symbol: symbol,
            owner: owner,
            controller: controller,
            registry: registry,
            deploymentTime: block.timestamp
        });
        
        deployedTokens.push(token);
        
        emit TokenDeployed(tokenAddress, name, symbol, owner, controller, registry);
    }
    
    /**
     * @notice Get bytecode for minimal proxy deployment
     * @param name Token name
     * @param symbol Token symbol
     * @param owner Token owner
     * @param controller Controller address
     * @param registry Compliance registry
     * @return bytecode Deployment bytecode
     */
    function _getBytecode(
        string memory name,
        string memory symbol,
        address owner,
        address controller,
        address registry
    ) internal view returns (bytes memory bytecode) {
        // EIP-1167 minimal proxy bytecode
        bytes memory proxyBytecode = abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            address(implementation),
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        
        // Encode constructor parameters
        bytes memory constructorArgs = abi.encode(name, symbol, owner, controller, registry);
        
        // Combine proxy bytecode with constructor args
        bytecode = abi.encodePacked(proxyBytecode, constructorArgs);
    }
    
    /**
     * @notice Get all deployed tokens
     * @return Array of deployed token addresses
     */
    function getAllTokens() external view returns (SecurityToken[] memory) {
        return deployedTokens;
    }
    
    /**
     * @notice Get deployment count
     * @return Number of deployed tokens
     */
    function getDeploymentCount() external view returns (uint256) {
        return deployedTokens.length;
    }
    
    /**
     * @notice Get token info by index
     * @param index Token index
     * @return token Token address
     * @return info Token information
     */
    function getTokenByIndex(uint256 index) external view returns (SecurityToken token, TokenInfo memory info) {
        require(index < deployedTokens.length, "Factory: index out of bounds");
        
        token = deployedTokens[index];
        info = tokenInfo[address(token)];
    }
    
    /**
     * @notice Check if address is a deployed token
     * @param token Token address to check
     * @return True if deployed by this factory
     */
    function isDeployedToken(address token) external view returns (bool) {
        return tokenInfo[token].deploymentTime > 0;
    }
    
    /**
     * @notice Get implementation contract address
     * @return Implementation address
     */
    function getImplementation() external view returns (address) {
        return address(implementation);
    }
}
