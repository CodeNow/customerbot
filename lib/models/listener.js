const ponos = require('ponos')
const log = require('util/logger').child({ module: 'customerbot' })

module.exports = new ponos.Server({
  name: process.env.APP_NAME,
  enableErrorEvents: true,
  rabbitmq: {
    channel: {
      prefetch: process.env.PHEIDI_PREFETCH
    },
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD
  },
  log: log,
  tasks: {},
  events: {
    'time.one-hour.passed': require('./workers/time.one-hour.passed')
  }
})
