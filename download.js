import http from 'http';
import fs from 'fs';

http.get('http://localhost:5000/api/debug/stock-ledger', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        fs.writeFileSync('ledger.json', data, 'utf8');
        console.log('Done');
    });
}).on('error', (err) => {
    console.error(err);
});
