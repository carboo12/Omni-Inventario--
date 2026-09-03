const https = require('https');

const API_KEY = 'b8877ed6-a044-4aeb-afd7-8d439dbc8f2c';
const url = `https://api.commoditypriceapi.com/v2/latest?items=XAU&access_key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const parsed = JSON.parse(data);
            console.log('Parsed Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('Error parsing JSON:', e.message);
            console.log('Raw Response:', data);
        }
    });
}).on('error', (err) => {
    console.log('Request Error:', err.message);
});
