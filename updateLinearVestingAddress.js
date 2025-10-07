
import { ethers } from 'ethers';
import fs from 'fs';

const contractAddress = process.argv[2];
if (!contractAddress) {
    console.error('❌ Please provide contract address: node updateLinearVestingAddress.js [CONTRACT_ADDRESS]');
    process.exit(1);
}

try {
    const deployedAddresses = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
    deployedAddresses.contracts.linearVesting.address = contractAddress;
    deployedAddresses.contracts.linearVesting.status = "deployed";
    deployedAddresses.contracts.linearVesting.deploymentConfirmed = true;
    
    // Update deployment order
    deployedAddresses.deploymentOrder[3] = "4. LinearVesting - ✅ COMPLETED";
    
    // Update next steps
    deployedAddresses.nextSteps = [
        "Update .env file with all addresses",
        "Begin token operations testing",
        "Set up Next.js operator console"
    ];
    
    fs.writeFileSync('DEPLOYED_ADDRESSES.json', JSON.stringify(deployedAddresses, null, 2));
    console.log('✅ Updated DEPLOYED_ADDRESSES.json with LinearVesting address:', contractAddress);
    console.log('🎯 All core contracts deployed! Ready for next phase.');
} catch (error) {
    console.error('❌ Failed to update addresses:', error.message);
}
