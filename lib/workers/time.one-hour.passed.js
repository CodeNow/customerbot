'use strict'

const Joi = require('joi')
const Promise = require('bluebird')
const log = require('../util/logger').child({ module: 'worker/time.one-hour.passed' })

const WorkerStopError = require('error-cat/errors/worker-stop-error')

/**
 * Schema for Priest jobs.
 * @type {Joi~Schema}
 */
module.exports.jobSchema = Joi.object({}).unknown()

/**
 * Priest
 *
 * @param {Object}   job - job passed by RabbitMQ
 * @return {Promise}
 */
module.exports.task = function Priest (job) {
  return Promise.try(() => {
    log.info('DEEZ NUTZ')
    return 'Works'
  })
  .catch(err => {
    throw new WorkerStopError(
      'Error publishing daily tasks.',
      { err }
    )
  })
}
