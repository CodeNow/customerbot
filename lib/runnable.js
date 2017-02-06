const Runnable = require('@runnable/api-client')
const promisifyClientModel = require('./util/promisify-client-model')
const logger = require('util/logger').child({ module: 'RunnableApiClient' })

class RunnableApiClient {

  constructor (config) {
    this.client = new Runnable(process.env.RUNNABLE_API_URL, { userContentDomain: process.env.RUNNABLE_USER_CONTENT_DOMAIN })
    promisifyClientModel(this.client)
    this.client.githubLoginAsync(process.env.GITHUB_ACCESS_TOKEN)
  }

  _fetchInstancesByOrg (orgName) {
    const log = logger.child({ method: 'fetchInstancesByOrg' })
    return this.client.fetchInstancesAsync({ githubUsername: orgName })
      .catch((err) => {
        log.info({ err: err }, err.message)
        if (err.level === 'critical') {
          throw err
        }
      })
  }

  _filterInstancesByContainerName (instances, containerName) {
    return instances.models
      .filter((x) => x.attrs.name.includes(containerName))
      .map((x) => promisifyClientModel(x))[0]
  }

  _fetchInstanceAttributesByOrgAndContainerName (orgName, containerName) {
    return this._fetchInstancesByOrg(orgName)
      .then(instances => {
        return this._filterInstancesByContainerName(instances, containerName)
      })
      .then(instance => {
        if (!instance) {
          throw new Error('No instances found!')
        }
        return Object.assign({}, instance.attrs, { status: instance.status() })
      })
  }

}

module.exports = RunnableApiClient
