const https = require('https');

https.get('https://www.google.com', (res) => {
    console.log('Status Code Google:', res.statusCode);
}).on('error', (err) => {
    console.log('Error Google:', err.message);
});
