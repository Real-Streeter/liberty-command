module.exports = {
  apps: [{
    name: 'liberty-command',
    script: './server/src/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      CORS_ORIGIN: 'https://libertymultimodal.com',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
