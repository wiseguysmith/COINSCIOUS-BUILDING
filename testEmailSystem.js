import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmailSystem() {
    try {
        console.log('📧 Testing email system...\n');
        
        // Check if email configuration is set
        if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'your-app-password') {
            console.log('⚠️  Email configuration not set up');
            console.log('💡 Set SMTP_PASS in .env file with your Gmail app password');
            return;
        }
        
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        
        console.log('📧 SMTP Configuration:');
        console.log('📍 Host:', process.env.SMTP_HOST);
        console.log('📍 Port:', process.env.SMTP_PORT);
        console.log('📍 User:', process.env.SMTP_USER);
        
        // Test connection
        console.log('\n🔌 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        
        // Send test email
        console.log('\n📤 Sending test email...');
        const testEmail = {
            from: process.env.SMTP_USER,
            to: process.env.SMTP_USER, // Send to self for testing
            subject: '🚨 COINSCIOUS Pilot Test Alert',
            html: `
                <h2>🎯 COINSCIOUS Platform Test</h2>
                <p><strong>Alert Type:</strong> System Test</p>
                <p><strong>Message:</strong> Email system is working correctly!</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>Network:</strong> Base Sepolia Testnet</p>
                <hr>
                <p><em>This is a test email from the COINSCIOUS pilot deployment.</em></p>
            `
        };
        
        const info = await transporter.sendMail(testEmail);
        console.log('✅ Test email sent successfully!');
        console.log('📍 Message ID:', info.messageId);
        
        console.log('\n🎯 Email system ready for pilot alerts!');
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        
        if (error.message.includes('authentication')) {
            console.error('💡 Check your Gmail app password in .env file');
            console.error('💡 Make sure 2-factor authentication is enabled on Gmail');
        } else if (error.message.includes('connection')) {
            console.error('💡 Check your internet connection and SMTP settings');
        }
    }
}

// Run the test
testEmailSystem()
    .then(() => {
        console.log('\n✅ Email system test complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Email system test failed:', error.message);
        process.exit(1);
    });
