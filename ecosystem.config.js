module.exports = {
  apps: [{
    name: 'n8n-download-bridge',
    script: 'uvicorn',
    args: 'main:app --host 0.0.0.0 --port 8000 --workers 2',
    interpreter: './venv/bin/python',
    cwd: '/Users/miguelcrasto/Downloads/n8n-download-bridge',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '.env',
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
