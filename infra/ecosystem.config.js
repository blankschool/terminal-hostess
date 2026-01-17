const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = {
  apps: [{
    name: 'n8n-download-bridge',
    // Executa o binário do uvicorn dentro do venv
    script: path.join(ROOT_DIR, 'venv/bin/uvicorn'),
    args: 'backend.main:app --host 0.0.0.0 --port 8000 --workers 2',
    interpreter: 'none',
    cwd: ROOT_DIR,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    env_file: path.join(ROOT_DIR, '.env'),
    error_file: path.join(ROOT_DIR, 'logs/error.log'),
    out_file: path.join(ROOT_DIR, 'logs/output.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
