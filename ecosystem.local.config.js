module.exports = {
  apps : [{
    name: 'tsl-server',
    script: 'server.js',
    autorestart: true,
    watch: true,
    ignore_watch : ['node_modules', 'shared'],
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    error_file: './shared/logs/err.log',
    out_file: './shared/logs/out.log',
    pid_file: './shared/pids/process.pid',
  }]
};
