const { Client } = require('ssh2');
const fs = require('fs');

const conf = `server {
  set $forward_scheme http;
  set $server         "192.168.100.2";
  set $port           3006;

  listen 80;
  listen [::]:80;

  server_name sat;

  access_log /data/logs/proxy-host-sat_access.log proxy;
  error_log /data/logs/proxy-host-sat_error.log warn;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Scheme $scheme;
    proxy_set_header X-Forwarded-Proto  $scheme;
    proxy_set_header X-Forwarded-For    $remote_addr;
    proxy_set_header X-Real-IP          $remote_addr;
    proxy_pass       http://192.168.100.2:3006;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
`;

fs.writeFileSync('C:\\Users\\Amy Uzcategui\\Documents\\SAT\\sat.conf', conf);

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if(err) throw err;
    sftp.fastPut('C:\\Users\\Amy Uzcategui\\Documents\\SAT\\sat.conf', '/home/uzcategui/sat.conf', (err) => {
      if(err) throw err;
      sftp.end();
      conn.exec('echo uzcategui | sudo -S mv /home/uzcategui/sat.conf /root/proxy/data/nginx/proxy_host/99-sat.conf', (err, stream) => {
        if(err) throw err;
        stream.on('close', () => {
          conn.exec('echo uzcategui | sudo -S docker exec proxy-manager nginx -s reload', (err, stream2) => {
            if(err) throw err;
            stream2.on('close', () => conn.end()).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stdout.write(d));
          });
        }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stdout.write(d));
      });
    });
  });
}).connect({ host:'192.168.100.2', port:22, username:'uzcategui', password:'uzcategui' });
