// Use environment variables if available, otherwise fall back to config.json for local development
let config;
try {
  config = require('./config.json');
} catch (e) {
  config = {};
}

const app = require('./app');

// Render provides PORT environment variable, use it if available
const port = process.env.PORT || process.env.SERVER_PORT || config.server_port || 3001;
const host = process.env.SERVER_HOST || config.server_host || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
