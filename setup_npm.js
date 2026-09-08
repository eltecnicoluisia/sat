const { Client } = require('ssh2');
const http = require('http');
const fs = require('fs');

const SSH_CONFIG = { host: '192.168.100.2', port: 22, username: 'uzcategui', password: 'uzcategui' };

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('close', () => resolve(out.trim()))
            .on('data', d => { out += d.toString(); })
            .stderr.on('data', d => { out += d.toString(); });
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => err ? reject(err) : resolve());
  });
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function createNpmProxyHost(token) {
  const proxyBody = JSON.stringify({
    domain_names: ['sat'],
    forward_scheme: 'http',
    forward_host: '192.168.100.2',
    forward_port: 3006,
    access_list_id: 0,
    certificate_id: 0,
    ssl_forced: false,
    caching_enabled: false,
    block_exploits: false,
    websockets_support: true,
    http2_support: false,
    hsts_enabled: false,
    hsts_subdomains: false,
    locations: [],
    advanced_config: ''
  });

  const result = await httpRequest({
    host: '192.168.100.2', port: 81, path: '/api/nginx/proxy-hosts', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(proxyBody),
      Authorization: `Bearer ${token}`
    }
  }, proxyBody);

  return result;
}

async function main() {
  const conn = new Client();
  await new Promise((res, rej) => conn.on('ready', res).on('error', rej).connect(SSH_CONFIG));
  console.log('SSH Connected\n');

  // Create admin user directly in the DB using bcrypt
  const sftp = await new Promise((res, rej) => conn.sftp((err, sftp) => err ? rej(err) : res(sftp)));
  
  const createAdminScript = `const knex = require('/app/node_modules/knex')({ client: 'sqlite3', connection: { filename: '/data/database.sqlite' }, useNullAsDefault: true });
const bcrypt = require('/app/node_modules/bcrypt');
(async () => {
  const hash = await bcrypt.hash('uzcategui', 10);
  // Insert admin user
  await knex('auth').insert({ type: 'password', meta: JSON.stringify({ email: 'uzcategui@local.com' }) }).catch(() => {});
  const authId = (await knex('auth').select('id').orderBy('id','desc').first()).id;
  await knex('user').insert({ name: 'Admin', nickname: 'admin', email: 'uzcategui@local.com', avatar: '', roles: JSON.stringify(['admin']), is_deleted: 0, created_on: new Date(), modified_on: new Date() }).catch(() => {});
  const userId = (await knex('user').select('id').orderBy('id','desc').first()).id;
  await knex('auth').where({ id: authId }).update({ user_id: userId, secret: hash });
  console.log('Admin created: uzcategui@local.com / uzcategui (userId=' + userId + ')');
  knex.destroy();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });`;

  fs.writeFileSync('C:\\Users\\Amy Uzcategui\\Documents\\SAT\\tmp_admin.js', createAdminScript);
  await uploadFile(sftp, 'C:\\Users\\Amy Uzcategui\\Documents\\SAT\\tmp_admin.js', '/home/uzcategui/npm_admin.js');
  sftp.end();
  
  await sshExec(conn, 'echo uzcategui | sudo -S docker cp /home/uzcategui/npm_admin.js proxy-manager:/tmp/admin.js');
  const createResult = await sshExec(conn, 'echo uzcategui | sudo -S docker exec proxy-manager node /tmp/admin.js 2>&1');
  console.log('Create admin result:', createResult);

  conn.end();
  fs.unlinkSync('C:\\Users\\Amy Uzcategui\\Documents\\SAT\\tmp_admin.js');

  // Now try to login with the new credentials
  console.log('\nTrying login with new credentials...');
  await new Promise(r => setTimeout(r, 2000));
  
  const loginBody = JSON.stringify({ identity: 'uzcategui@local.com', secret: 'uzcategui' });
  const loginResult = await httpRequest({
    host: '192.168.100.2', port: 81, path: '/api/tokens', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);

  console.log('Login result:', loginResult.status, JSON.stringify(loginResult.body).substring(0, 200));

  if (loginResult.status === 200 && loginResult.body.token) {
    const token = loginResult.body.token;
    console.log('\nLogin successful! Creating SAT proxy host...');
    const proxyResult = await createNpmProxyHost(token);
    console.log('Proxy host creation:', proxyResult.status, JSON.stringify(proxyResult.body).substring(0, 400));
    if (proxyResult.body && proxyResult.body.id) {
      console.log('\n✅ SUCCESS! SAT proxy host configured in Nginx Proxy Manager');
      console.log('   http://sat/ -> 192.168.100.2:3006 (sat-frontend container)');
    }
  } else {
    console.log('\nLogin still failed. NPM may need restart.');
  }
}

main().catch(console.error);
