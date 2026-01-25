
import axios from "axios";
import fs from "fs";

async function testApi() {
    try {
        const res = await axios.get("http://localhost:5000/api/bom-recipes");
        fs.writeFileSync("api_result.json", JSON.stringify(res.data, null, 2));
        console.log("Success! Result in api_result.json");
    } catch (err: any) {
        const errorInfo = {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data
        };
        fs.writeFileSync("api_error.json", JSON.stringify(errorInfo, null, 2));
        console.log("Failed! Error in api_error.json");
    }
    process.exit();
}

testApi();
