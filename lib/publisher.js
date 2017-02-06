'use strict'
require('loadenv')()

const Promise = require('bluebird')
const Joi = Promise.promisifyAll(require('joi'))

const RabbitMQClient = require('ponos/lib/rabbitmq')

class RabbitMQ extends RabbitMQClient {

  constructor () {
    super({
      name: process.env.APP_NAME,
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
      tasks: [],
      events: [{
        name: 'time.one-hour.passed',
        jobSchema: Joi.object({}).unknown()
      }]
    })
  }
}

module.exports = new RabbitMQ()
