const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');

// Set NODE_ENV to 'production' if it's not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/shivsingh.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/shivsingh.com/fullchain.pem'),
};

app.prepare().then(() => {
  createServer(options, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(443, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://localhost (${process.env.NODE_ENV} mode)`);
  });
});