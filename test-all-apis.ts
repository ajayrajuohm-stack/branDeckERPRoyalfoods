
import axios from "axios";

async function testAll() {
    const ports = [5000, 3000];
    const endpoints = [
        "/api/items",
        "/api/bom-recipes"
    ];

    for (const port of ports) {
        console.log(`\nTesting Port ${port}...`);
        for (const ep of endpoints) {
            try {
                const res = await axios.get(`http://localhost:${port}${ep}`);
                console.log(`  ${ep}: SUCCESS (${Array.isArray(res.data) ? res.data.length : 'object'} items)`);
            } catch (err: any) {
                console.log(`  ${ep}: FAILED (${err.message})`);
                if (err.response) {
                    // Log first 100 chars of error body
                    console.log(`    Error: ${JSON.stringify(err.response.data).substring(0, 100)}`);
                }
            }
        }
    }
}

testAll();
