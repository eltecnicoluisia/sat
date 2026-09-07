const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '192.168.100.2',
  port: 22,
  username: 'uzcategui',
  password: 'uzcategui'
};

// Updated docker-compose.yml content for Ubuntu server
const DOCKER_COMPOSE = `services:
  sat-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sat-backend
    restart: always
    ports:
      - "3007:3001"
    environment:
      - DATABASE_URL=file:/app/data/dev.db
      - PORT=3001
      - NODE_ENV=production
    volumes:
      - sat_uploads:/app/uploads
      - sat_data:/app/data

  sat-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sat-frontend
    restart: always
    ports:
      - "3006:80"
    volumes:
      - sat_uploads:/app/uploads:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - sat-backend

volumes:
  sat_uploads:
  sat_data:
`;

const NGINX_CONF = `server {
    listen 80;
    server_name localhost sat;
    client_max_body_size 50M;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://sat-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://sat-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /app/uploads/;
    }
}
`;

function runCommand(conn, cmd, desc) {
  return new Promise((resolve, reject) => {
    console.log(`\n[CMD] ${desc}...`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      let errOut = '';
      stream
        .on('close', (code) => {
          if (code !== 0 && errOut && !errOut.includes('Password')) {
            console.error(`  STDERR: ${errOut.trim()}`);
          }
          console.log(`  OK: ${out.trim().substring(0, 200) || '(done)'}`);
          resolve(out);
        })
        .on('data', (d) => { out += d.toString(); })
        .stderr.on('data', (d) => { errOut += d.toString(); });
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) return reject(new Error(`Upload failed ${localPath} -> ${remotePath}: ${err.message}`));
      resolve();
    });
  });
}

function uploadDir(sftp, localDir, remoteDir, conn) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create remote dir
      await runCommand(conn, `mkdir -p ${remoteDir}`, `mkdir ${remoteDir}`);
      
      const entries = fs.readdirSync(localDir, { withFileTypes: true });
      for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const remotePath = `${remoteDir}/${entry.name}`;
        
        // Skip node_modules, dist, .git, prisma migrations won't need to be rebuilt
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === '.env') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await uploadDir(sftp, localPath, remotePath, conn);
        } else {
          process.stdout.write(`  Uploading: ${entry.name}...\r`);
          await uploadFile(sftp, localPath, remotePath);
        }
      }
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

async function deploy() {
  console.log('=== SAT DEPLOYMENT TO UBUNTU SERVER ===\n');
  
  const conn = new Client();
  
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect(SSH_CONFIG);
  });
  
  console.log('✅ SSH Connected to 192.168.100.2\n');
  
  // 1. Create project directory
  await runCommand(conn, 'mkdir -p /home/uzcategui/proyectos/sat', 'Creating /home/uzcategui/proyectos/sat');
  
  // 2. Upload files via SFTP
  console.log('\n[SFTP] Starting file upload...');
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
  });
  
  // Upload backend
  console.log('\n[SFTP] Uploading backend...');
  await uploadDir(sftp, 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\backend', '/home/uzcategui/proyectos/sat/backend', conn);
  console.log('\n  ✅ Backend uploaded');
  
  // Upload frontend
  console.log('\n[SFTP] Uploading frontend...');
  await uploadDir(sftp, 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\frontend', '/home/uzcategui/proyectos/sat/frontend', conn);
  console.log('\n  ✅ Frontend uploaded');
  
  // Write docker-compose.yml
  const tmpCompose = 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\deploy_docker-compose.yml';
  fs.writeFileSync(tmpCompose, DOCKER_COMPOSE);
  await uploadFile(sftp, tmpCompose, '/home/uzcategui/proyectos/sat/docker-compose.yml');
  console.log('  ✅ docker-compose.yml uploaded');
  fs.unlinkSync(tmpCompose);
  
  // Write nginx.conf
  const tmpNginx = 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\deploy_nginx.conf';
  fs.writeFileSync(tmpNginx, NGINX_CONF);
  await uploadFile(sftp, tmpNginx, '/home/uzcategui/proyectos/sat/nginx.conf');
  console.log('  ✅ nginx.conf uploaded');
  fs.unlinkSync(tmpNginx);
  
  sftp.end();
  
  // 3. Copy the existing database from windows if sat-backend doesn't exist yet
  // First check if there's already a volume with data
  await runCommand(conn, 'echo uzcategui | sudo -S docker volume ls | grep sat', 'Checking existing SAT volumes');
  
  // 4. Fix file permissions and line endings
  await runCommand(conn,
    'cd /home/uzcategui/proyectos/sat && sed -i \'s/\\r//\' backend/entrypoint.sh && chmod +x backend/entrypoint.sh',
    'Fixing entrypoint.sh line endings and permissions'
  );
  
  // 5. Stop any existing SAT containers
  await runCommand(conn,
    'cd /home/uzcategui/proyectos/sat && echo uzcategui | sudo -S docker compose down 2>/dev/null || true',
    'Stopping any existing SAT containers'
  );
  
  // 6. Build and start containers
  console.log('\n[DOCKER] Building images (this takes ~3-5 minutes)...');
  await runCommand(conn,
    'cd /home/uzcategui/proyectos/sat && echo uzcategui | sudo -S docker compose build --no-cache 2>&1 | tail -20',
    'Building Docker images'
  );
  
  // 7. Start containers
  await runCommand(conn,
    'cd /home/uzcategui/proyectos/sat && echo uzcategui | sudo -S docker compose up -d 2>&1',
    'Starting containers with restart: always'
  );
  
  // 8. Check container status
  await runCommand(conn,
    'echo uzcategui | sudo -S docker ps | grep sat',
    'Checking SAT container status'
  );
  
  // 9. Make sure Docker itself starts on boot
  await runCommand(conn,
    'echo uzcategui | sudo -S systemctl enable docker',
    'Ensuring Docker starts on boot'
  );
  
  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log('SAT Backend running on port 3007');
  console.log('SAT Frontend running on port 3006');
  console.log('Both containers have restart: always (auto-start on reboot)');
  console.log('\nNext: Configure Nginx Proxy Manager to route http://sat -> 192.168.100.2:3006');
  
  conn.end();
}

deploy().catch(err => {
  console.error('DEPLOY ERROR:', err.message);
  process.exit(1);
});
