// Config PM2 para OmniPOS (migración Vite + Hono).
// Un solo proceso: el servidor Hono sirve API + estáticos del frontend.
const path = require('path');

module.exports = {
    apps: [{
        name: "omni-pos",
        script: "dist-server/index.mjs",
        cwd: __dirname,
        env: {
            NODE_ENV: "production",
            PORT: 9003
        },
        autorestart: true,
        watch: false,
        max_memory_restart: "500M",
        restart_delay: 5000,
        max_restarts: 10,
        out_file: path.join(__dirname, "logs", "out.log"),
        error_file: path.join(__dirname, "logs", "error.log"),
        merge_logs: true,
        time: true
    }]
}