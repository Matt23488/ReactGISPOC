const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const settings = require('./appsettings');

const PORT = process.env.PORT || 3001;

const app = express();

app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get('/api/token', async (req, res) => {
    const options = {
        client_id: settings.oAuth.clientID,
        client_secret: settings.oAuth.clientSecret,
        grant_type: 'client_credentials',
        expiration: '20160',
        f: 'json'
    };
    const params = [];
    for (let key in options) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
    }

    const tokenRes = await fetch(settings.oAuth.tokenURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.join('&')
    });

    const tokenData = await tokenRes.json();
    res.json(tokenData);
});

app.get('/api', async (req, res) => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    res.json({ message: 'Hello from server!' });
});

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}/`);
});