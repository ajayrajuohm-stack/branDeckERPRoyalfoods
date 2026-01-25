
import axios from "axios";

async function testApi() {
    const ports = [5000, 3000, 5173];
    for (const port of ports) {
        try {
            console.log(`Trying http://localhost:${port}/api/bom-recipes...`);
            const res = await axios.get(`http://localhost:${port}/api/bom-recipes`);
            console.log(`Success on port ${port}!`);
            console.log("Data count:", res.data.length);
            return;
        } catch (err: any) {
            console.log(`Failed on port ${port}: ${err.message}`);
            if (err.response) {
                console.log("Error details:", JSON.stringify(err.response.data, null, 2));
            }
        }
    }
}

testApi();
