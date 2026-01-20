// Simple script to clear all transaction data
import http from 'http';

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/debug/clear-all-data',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n✅ Response:', JSON.parse(data));
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});

console.log('🔄 Clearing all transaction data...');
req.end();
