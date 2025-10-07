
import { ethers } from 'ethers';
import fs from 'fs';

const contractAddress = process.argv[2];
if (!contractAddress) {
    console.error('❌ Please provide contract address: node updateAddresses.js [CONTRACT_ADDRESS]');
    process.exit(1);
}

try {
    const deployedAddresses = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
    deployedAddresses.contracts.securityToken.address = contractAddress;
    deployedAddresses.contracts.securityToken.status = "deployed";
    deployedAddresses.contracts.securityToken.deploymentConfirmed = true;
    
    fs.writeFileSync('DEPLOYED_ADDRESSES.json', JSON.stringify(deployedAddresses, null, 2));
    console.log('✅ Updated DEPLOYED_ADDRESSES.json with SecurityToken address:', contractAddress);
} catch (error) {
    console.error('❌ Failed to update addresses:', error.message);
}
