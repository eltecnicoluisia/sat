const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if(err) throw err;
    console.log('Uploading Dockerfile...');
    sftp.fastPut('C:\\\\Users\\\\Amy Uzcategui\\\\Documents\\\\SAT\\\\backend\\\\Dockerfile',
      '/home/uzcategui/proyectos/sat/backend/Dockerfile',
      (err) => {
        if(err) throw err;
        console.log('Dockerfile uploaded. Also uploading dev.db just in case...');
        
        sftp.fastPut('C:\\\\Users\\\\Amy Uzcategui\\\\Documents\\\\SAT\\\\backend\\\\prisma\\\\dev.db',
          '/home/uzcategui/proyectos/sat/backend/prisma/dev.db',
          (err) => {
            if(err) throw err;
            sftp.end();
            console.log('dev.db uploaded. Rebuilding container...');
            
            conn.exec('cd /home/uzcategui/proyectos/sat && echo uzcategui | sudo -S docker compose build sat-backend 2>&1 | tail -30', (err, stream) => {
              if(err) throw err;
              stream.on('close', () => {
                console.log('Build finished. Starting container...');
                conn.exec('cd /home/uzcategui/proyectos/sat && echo uzcategui | sudo -S docker compose up -d sat-backend 2>&1', (err, stream2) => {
                  if(err) throw err;
                  stream2.on('close', () => {
                    console.log('Container started. Copying dev.db into volume...');
                    // Copy dev.db into the volume via the running container
                    conn.exec('echo uzcategui | sudo -S docker cp /home/uzcategui/proyectos/sat/backend/prisma/dev.db sat-backend:/app/data/dev.db', (err, stream3) => {
                      if(err) throw err;
                      stream3.on('close', () => {
                        console.log('DB copied. Restarting backend...');
                        conn.exec('echo uzcategui | sudo -S docker restart sat-backend', (err, stream4) => {
                          if(err) throw err;
                          stream4.on('close', () => {
                            console.log('Done!');
                            conn.end();
                          }).on('data', d => process.stdout.write(d));
                        });
                      }).on('data', d => process.stdout.write(d));
                    });
                  }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
                });
              }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
            });
          }
        );
      }
    );
  });
}).connect({ host:'192.168.100.2', port:22, username:'uzcategui', password:'uzcategui' });
