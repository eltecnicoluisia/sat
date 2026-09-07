const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('echo uzcategui | sudo -S docker start makroredvital-frontend && echo uzcategui | sudo -S docker update --restart unless-stopped makroredvital-frontend', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: '192.168.100.2',
  port: 22,
  username: 'uzcategui',
  password: 'uzcategui'
});
