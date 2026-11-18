const path = require('path');

module.exports = {
  apps: [
    {
      name: 'bga-portal',
      script: 'dist/index.js',
      cwd: path.resolve(__dirname, 'server'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5018,
      },
    },
  ],
};
