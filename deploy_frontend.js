const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

const LOCAL_DIST = 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\frontend\\dist';
const CONTAINER = 'sat-frontend';
const CONTAINER_PATH = '/usr/share/nginx/html';
const REMOTE_ARCHIVE = '/home/uzcategui/sat_dist.tar.gz';
const LOCAL_ARCHIVE = 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\sat_dist.tar.gz';

// Step 1: Create tar.gz archive locally using PowerShell
const { execSync } = require('child_process');
console.log('Creating archive...');
execSync(`powershell -Command "Compress-Archive -Path 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\frontend\\dist\\*' -DestinationPath 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\sat_dist.zip' -Force"`);
console.log('Archive created. Connecting via SSH...');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Uploading zip...');
    sftp.fastPut(
      'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\sat_dist.zip',
      '/home/uzcategui/sat_dist.zip',
      (err) => {
        if (err) throw err;
        sftp.end();
        console.log('Zip uploaded. Extracting and copying to container...');
        const cmd = [
          'rm -rf /home/uzcategui/sat_dist',
          'mkdir -p /home/uzcategui/sat_dist',
          'cd /home/uzcategui/sat_dist && unzip -o /home/uzcategui/sat_dist.zip',
          `echo uzcategui | sudo -S docker cp /home/uzcategui/sat_dist/. ${CONTAINER}:${CONTAINER_PATH}/`,
          'rm -f /home/uzcategui/sat_dist.zip',
          'rm -rf /home/uzcategui/sat_dist'
        ].join(' && ');
        
        conn.exec(cmd, (err, stream) => {
          if (err) throw err;
          stream.on('close', () => {
            console.log('Done! Frontend updated.');
            conn.end();
          }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
        });
      }
    );
  });
}).connect({ host: '192.168.100.2', port: 22, username: 'uzcategui', password: 'uzcategui' });
