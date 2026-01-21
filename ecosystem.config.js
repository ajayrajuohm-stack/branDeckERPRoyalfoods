module.exports = {
  apps: [{
    name: 'royal-foods-erp',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart on crash
    min_uptime: '10s',
    max_restarts: 10,
    // Exponential backoff restart delay
    restart_delay: 4000,
    // Kill timeout
    kill_timeout: 5000,
    // Wait for app to be ready
    wait_ready: false,
    // Graceful shutdown
    shutdown_with_message: true
  }]
};
