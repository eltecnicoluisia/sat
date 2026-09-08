const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  // First extract the zip with python3 (already uploaded as sat_dist.zip)
  conn.exec('python3 -c "import zipfile; zipfile.ZipFile(\'/home/uzcategui/sat_dist.zip\').extractall(\'/home/uzcategui/sat_dist\')"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('Extracted. Copying to container...');
      conn.exec('echo uzcategui | sudo -S docker cp /home/uzcategui/sat_dist/. sat-frontend:/usr/share/nginx/html/', (err, s2) => {
        if (err) throw err;
        s2.on('close', () => {
          console.log('Copied to container. Cleaning up...');
          conn.exec('rm -f /home/uzcategui/sat_dist.zip && rm -rf /home/uzcategui/sat_dist', (err, s3) => {
            if (err) throw err;
            s3.on('close', () => { console.log('Done!'); conn.end(); });
          });
        }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
      });
    }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '192.168.100.2', port: 22, username: 'uzcategui', password: 'uzcategui' });
