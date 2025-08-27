// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PayoutDistributor.sol";

/**
 * @title PayoutDistributorFactory
 * @notice Factory for creating PayoutDistributor clones using EIP-1167 minimal proxy pattern
 * @dev Efficiently deploys new distributor instances with minimal gas cost
 */
contract PayoutDistributorFactory is Ownable {
    // Implementation contract address
    PayoutDistributor public immutable implementation;
    
    // Array of all deployed distributors
    PayoutDistributor[] public deployedDistributors;
    
    // Mapping from distributor address to deployment info
    mapping(address => DistributorInfo) public distributorInfo;
    
    // Events
    event DistributorDeployed(
        address indexed distributor,
        address indexed token,
        address indexed owner,
        uint256 deploymentTime
    );
    
    struct DistributorInfo {
        address token;
        address owner;
        uint256 deploymentTime;
    }
    
    /**
     * @notice Initialize the factory with implementation contract
     * @param _implementation PayoutDistributor implementation contract
     */
    constructor(PayoutDistributor _implementation) Ownable(msg.sender) {
        require(address(_implementation) != address(0), "Factory: implementation cannot be zero");
        implementation = _implementation;
    }
    
    /**
     * @notice Deploy a new PayoutDistributor clone
     * @param token SecurityToken address
     * @param owner Distributor owner address
     * @return distributor Address of the deployed distributor
     */
    function deployDistributor(
        address token,
        address owner
    ) external onlyOwner returns (PayoutDistributor distributor) {
        require(token != address(0), "Factory: token cannot be zero");
        require(owner != address(0), "Factory: owner cannot be zero");
        
        // Deploy minimal proxy
        bytes memory bytecode = _getBytecode(token, owner);
        address distributorAddress;
        
        assembly {
            distributorAddress := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        
        require(distributorAddress != address(0), "Factory: deployment failed");
        
        distributor = PayoutDistributor(distributorAddress);
        
        // Store deployment info
        distributorInfo[distributorAddress] = DistributorInfo({
            token: token,
            owner: owner,
            deploymentTime: block.timestamp
        });
        
        deployedDistributors.push(distributor);
        
        emit DistributorDeployed(distributorAddress, token, owner, block.timestamp);
    }
    
    /**
     * @notice Get bytecode for minimal proxy deployment
     * @param token SecurityToken address
     * @param owner Distributor owner
     * @return bytecode Deployment bytecode
     */
    function _getBytecode(
        address token,
        address owner
    ) internal view returns (bytes memory bytecode) {
        // EIP-1167 minimal proxy bytecode
        bytes memory proxyBytecode = abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            address(implementation),
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        
        // Encode constructor parameters
        bytes memory constructorArgs = abi.encode(token, owner);
        
        // Combine proxy bytecode with constructor args
        bytecode = abi.encodePacked(proxyBytecode, constructorArgs);
    }
    
    /**
     * @notice Get all deployed distributors
     * @return Array of deployed distributor addresses
     */
    function getAllDistributors() external view returns (PayoutDistributor[] memory) {
        return deployedDistributors;
    }
    
    /**
     * @notice Get deployment count
     * @return Number of deployed distributors
     */
    function getDeploymentCount() external view returns (uint256) {
        return deployedDistributors.length;
    }
    
    /**
     * @notice Get distributor info by index
     * @param index Distributor index
     * @return distributor Distributor address
     * @return info Distributor information
     */
    function getDistributorByIndex(uint256 index) external view returns (PayoutDistributor distributor, DistributorInfo memory info) {
        require(index < deployedDistributors.length, "Factory: index out of bounds");
        
        distributor = deployedDistributors[index];
        info = distributorInfo[address(distributor)];
    }
    
    /**
     * @notice Check if address is a deployed distributor
     * @param distributor Distributor address to check
     * @return True if deployed by this factory
     */
    function isDeployedDistributor(address distributor) external view returns (bool) {
        return distributorInfo[distributor].deploymentTime > 0;
    }
    
    /**
     * @notice Get implementation contract address
     * @return Implementation address
     */
    function getImplementation() external view returns (address) {
        return address(implementation);
    }
    
    /**
     * @notice Get distributors for a specific token
     * @param token SecurityToken address
     * @return distributors Array of distributor addresses
     */
    function getDistributorsForToken(address token) external view returns (PayoutDistributor[] memory distributors) {
        uint256 count = 0;
        
        // Count matching distributors
        for (uint256 i = 0; i < deployedDistributors.length; i++) {
            if (distributorInfo[address(deployedDistributors[i])].token == token) {
                count++;
            }
        }
        
        // Create array with matching distributors
        distributors = new PayoutDistributor[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < deployedDistributors.length; i++) {
            if (distributorInfo[address(deployedDistributors[i])].token == token) {
                distributors[index] = deployedDistributors[i];
                index++;
            }
        }
    }
}
