const config = require('./config.json');
const app = require('./app');

const port = config.server_port;
const host = config.server_host;

app.listen(port, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
