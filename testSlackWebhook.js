import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testSlackWebhook() {
    try {
        // Get the webhook URL from environment
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        
        if (!webhookUrl) {
            console.error('❌ SLACK_WEBHOOK_URL not found in .env file');
            return;
        }

        // Check if it's still the placeholder
        if (webhookUrl.includes('hooks.slack.com/services/...')) {
            console.error('❌ SLACK_WEBHOOK_URL is still set to placeholder value');
            console.log('💡 Please update your .env file with the actual Slack webhook URL');
            return;
        }

        console.log('🔌 Testing Slack webhook notification...');
        console.log('📍 Webhook URL:', webhookUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

        // Prepare the message payload
        const message = {
            text: "🚨 Test Notification\naccept 1,000,000 USD deposited into your account?"
        };

        // Send the POST request
        const response = await axios.post(webhookUrl, message, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Check if the request was successful
        if (response.status === 200) {
            console.log('✅ Slack notification sent successfully!');
            console.log('📊 Response status:', response.status);
            console.log('📝 Response data:', response.data);
        } else {
            console.log('⚠️ Unexpected response status:', response.status);
            console.log('📝 Response data:', response.data);
        }

    } catch (error) {
        console.error('❌ Failed to send Slack notification:');
        
        if (error.response) {
            // Server responded with error status
            console.error('📊 Status:', error.response.status);
            console.error('📝 Response:', error.response.data);
            
            if (error.response.status === 404) {
                console.error('💡 Hint: Check if the webhook URL is correct');
            } else if (error.response.status === 400) {
                console.error('💡 Hint: Check if the message format is correct');
            }
        } else if (error.request) {
            // Request was made but no response received
            console.error('📝 No response received:', error.message);
            console.error('💡 Hint: Check your internet connection and webhook URL');
        } else {
            // Something else happened
            console.error('📝 Error:', error.message);
        }
    }
}

// Run the test
console.log('🚀 Starting Slack webhook test...\n');
testSlackWebhook();
