import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function sendPilotStatusNotification() {
    try {
        console.log('📱 Sending COINSCIOUS Pilot Status to Slack...\n');
        
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        
        if (!webhookUrl || webhookUrl.includes('hooks.slack.com/services/...')) {
            console.error('❌ SLACK_WEBHOOK_URL not configured');
            return;
        }
        
        // Create comprehensive pilot status message
        const message = {
            text: "🎯 COINSCIOUS Platform - Pilot Status Update",
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🎯 COINSCIOUS Platform Pilot Status"
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: "*Network:*\nBase Sepolia Testnet"
                        },
                        {
                            type: "mrkdwn",
                            text: "*Status:*\nContract Deployment Phase"
                        },
                        {
                            type: "mrkdwn",
                            text: "*Deployer:*\n`0x57F6251028d290730CeE7E622b2967e36Fd7D00a`"
                        },
                        {
                            type: "mrkdwn",
                            text: "*Balance:*\n0.002 ETH (✅ Sufficient)"
                        }
                    ]
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*📋 Deployment Progress:*"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "✅ *MockUSDC:* `0x33df6a1516cd45e1f4afbf55dd228613cc7139fa`\n✅ *ComplianceRegistry:* `0xCC602E09ab7961d919A1b0bb6a4452a9F860d488`\n🚧 *SecurityToken:* Deploying...\n⏳ *LinearVesting:* Pending"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*🔧 Infrastructure Status:*\n✅ Slack Notifications\n✅ Supabase Database\n✅ Network Connection\n❌ Email System (needs Gmail app password)"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*⏰ Last Updated:* ${new Date().toLocaleString()}`
                    }
                },
                {
                    type: "divider"
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: "🚀 COINSCIOUS Real Estate Tokenization Platform - Exception Pilot"
                        }
                    ]
                }
            ]
        };
        
        console.log('📤 Sending detailed pilot status...');
        
        const response = await axios.post(webhookUrl, message, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 200) {
            console.log('✅ Pilot status notification sent successfully!');
            console.log('📊 Response:', response.data);
        } else {
            console.log('⚠️ Unexpected response status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Failed to send pilot status:', error.message);
        
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📝 Response:', error.response.data);
        }
    }
}

// Send the notification
sendPilotStatusNotification()
    .then(() => {
        console.log('\n✅ Pilot status notification complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Pilot status notification failed:', error.message);
        process.exit(1);
    });
