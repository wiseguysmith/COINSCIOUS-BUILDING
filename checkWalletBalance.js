import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkWalletBalance() {
    try {
        console.log('💰 Checking wallet balance and faucet status...\n');
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_BASE_SEPOLIA);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📍 Wallet Address:', wallet.address);
        console.log('📍 Network:', process.env.RPC_URL_BASE_SEPOLIA);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        const balanceInETH = ethers.formatEther(balance);
        
        console.log('💰 Current Balance:', balanceInETH, 'ETH');
        
        // Check if we need more ETH
        const minBalance = 0.001; // 0.001 ETH minimum for deployments
        const currentBalance = parseFloat(balanceInETH);
        
        if (currentBalance < minBalance) {
            console.log('⚠️  LOW BALANCE WARNING!');
            console.log('💡 You need more testnet ETH for deployments');
            console.log('🌐 Get more ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
            console.log('📍 Enter this address:', wallet.address);
        } else {
            console.log('✅ Balance is sufficient for deployments');
        }
        
        // Check recent transactions
        console.log('\n📊 Recent Transactions:');
        try {
            const blockNumber = await provider.getBlockNumber();
            console.log('📍 Current Block:', blockNumber);
            
            // Get last few blocks to see if there are any recent transactions
            for (let i = 0; i < 3; i++) {
                const block = await provider.getBlock(blockNumber - i);
                console.log(`📍 Block ${blockNumber - i}: ${block.transactions.length} transactions`);
            }
        } catch (error) {
            console.log('📊 Could not fetch recent blocks:', error.message);
        }
        
        // Deployment cost estimate
        console.log('\n💸 Estimated Deployment Costs:');
        console.log('📍 SecurityToken: ~0.001 ETH');
        console.log('📍 LinearVesting: ~0.0005 ETH');
        console.log('📍 Total needed: ~0.0015 ETH');
        console.log('📍 Current balance:', balanceInETH, 'ETH');
        
        if (currentBalance >= 0.0015) {
            console.log('✅ Sufficient balance for all deployments!');
        } else {
            console.log('⚠️  Need more ETH for complete deployment');
        }
        
    } catch (error) {
        console.error('❌ Error checking wallet:', error.message);
        
        if (error.message.includes('network')) {
            console.error('💡 Check your RPC_URL_BASE_SEPOLIA in .env file');
        }
    }
}

// Run the check
checkWalletBalance()
    .then(() => {
        console.log('\n✅ Wallet check complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Wallet check failed:', error.message);
        process.exit(1);
    });
