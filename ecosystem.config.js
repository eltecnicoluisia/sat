module.exports = {
  apps: [
    {
      name: 'sat-backend',
      cwd: 'C:/Users/Amy Uzcategui/Documents/SAT/backend',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'index.ts',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: 'file:./prisma/dev.db'
      }
    },
    {
      name: 'sat-frontend',
      cwd: 'C:/Users/Amy Uzcategui/Documents/SAT/frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: '--host 127.0.0.1',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};


