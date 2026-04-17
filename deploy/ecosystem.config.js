module.exports = {
  apps: [
    {
      name: 'whatsapp-bot',
      script: './skills/whatsapp-integration/mcp-whatsapp-server.js',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        WHATSAPP_SESSION_PATH: './data/whatsapp-sessions',
        DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENSQUAD_BASE_PATH: process.env.OPENSQUAD_BASE_PATH || '/app/opensquad'
      },
      error_file: './logs/whatsapp-error.log',
      out_file: './logs/whatsapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'orchestrator',
      script: './orchestrator/orchestrator.js',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENSQUAD_BASE_PATH: process.env.OPENSQUAD_BASE_PATH || '/app/opensquad',
        MAX_CONCURRENT_SQUADS: 5,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
      },
      error_file: './logs/orchestrator-error.log',
      out_file: './logs/orchestrator-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'shlomo-ledger',
      script: 'npx serve -s shlomo-ledger/dist -l 3000',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/dashboard-error.log',
      out_file: './logs/dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
