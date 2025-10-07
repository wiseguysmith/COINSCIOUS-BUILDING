import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Client } = pg;

async function testDatabaseConnection() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Supabase
        }
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully!');

        console.log('📊 Running test query...');
        const result = await client.query('SELECT NOW() as current_time');
        
        console.log('🎉 Query successful!');
        console.log('Current database time:', result.rows[0].current_time);
        
        // Test the coinscious table
        console.log('📋 Testing coinscious table...');
        const tableResult = await client.query('SELECT * FROM coinscious LIMIT 5');
        console.log('📊 Table rows:', tableResult.rows);
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        
        if (error.code) {
            console.error('Error code:', error.code);
        }
        
        if (error.code === 'ENOTFOUND') {
            console.error('💡 Hint: Check your DATABASE_URL - hostname not found');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('💡 Hint: Connection refused - check host/port');
        } else if (error.code === '28P01') {
            console.error('💡 Hint: Authentication failed - check username/password');
        } else if (error.code === '3D000') {
            console.error('💡 Hint: Database does not exist');
        } else if (error.code === '42P01') {
            console.error('💡 Hint: Table "coinscious" does not exist');
        }
        
    } finally {
        console.log('🔌 Closing connection...');
        await client.end();
        console.log('✅ Connection closed.');
    }
}

// Run the test
testDatabaseConnection();