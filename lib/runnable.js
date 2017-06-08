const Runnable = require('@runnable/api-client')
const promisifyClientModel = require('./util/promisify-client-model')
const logger = require('util/logger').child({ module: 'RunnableApiClient' })

const url = require('url')
const keypather = require('keypather')()

class RunnableApiClient {

  constructor (config) {
    this.client = new Runnable(process.env.RUNNABLE_API_URL, { userContentDomain: process.env.RUNNABLE_USER_CONTENT_DOMAIN })
    promisifyClientModel(this.client)
    this.client.githubLoginAsync(process.env.GITHUB_ACCESS_TOKEN)
  }

  fetchInstancesByOrg (orgName) {
    const log = logger.child({ method: 'fetchInstancesByOrg' })
    return this.client.fetchInstancesAsync({ githubUsername: orgName })
      .catch((err) => {
        log.info({ err: err }, err.message)
        if (err.level === 'critical') {
          throw err
        }
      })
  }

  filterInstancesByContainerName (instances, containerName) {
    return instances.models
      .filter((x) => x.attrs.name.includes(containerName))
      .map((x) => promisifyClientModel(x))[0]
  }

  fetchInstanceAttributesByOrgAndContainerName (orgName, containerName) {
    return this.fetchInstancesByOrg(orgName)
      .then(instances => {
        return this.filterInstancesByContainerName(instances, containerName)
      })
      .then(instance => {
        if (!instance) {
          throw new Error('No instances found!')
        }
        return Object.assign({}, instance.attrs, { status: instance.status() })
      })
  }

  getApiInfo (message) {
    let parsedURL = url.parse(message.args[0].split('<').join('').split('>').join(''))
    let argument = message.args[1]
    let parsedPathname = parsedURL.pathname.split('/')
    let org = parsedPathname[1]
    let container = parsedPathname[2]
    if (org !== null && container !== null) {
      switch (argument) {
        case 'url':
          return `https://api.runnable.io/instances/?githubUsername=${org}&name=${container}`
        case '':
        case null:
        case undefined:
          return this.fetchInstanceAttributesByOrgAndContainerName(org, container)
            .then(instance => {
              return `*containerID:* ${instance.container.inspect.Id}\n` +
                `*containerName:* ${instance.name}\n` +
                `*orgName:* ${instance.owner.username}\n` +
                `*orgID:* ${instance.owner.github}\n` +
                `*cvBuildID:* ${instance.contextVersion.build._id}\n` +
                `*status:* ${instance.status}\n` +
                `*buildCreated:* ${instance.build.created}\n` +
                `*buildStarted:* ${instance.build.started}\n` +
                `*buildCompleted:* ${instance.build.completed}\n` +
                `*buildCreatedBy:* ${instance.build.createdBy.github}\n` +
                `*buildFailed:* ${instance.build.failed}\n` +
                `*buildDuration:* ${instance.build.duration ? new Date(instance.build.duration).getMinutes() + ' mins' : null}\n` +
                `*buildHost:* ${instance.container.dockerHost ? url.parse(instance.container.dockerHost).hostname : null}`
            })
        default:
          return this.fetchInstanceAttributesByOrgAndContainerName(org, container)
            .then(instance => {
              let result = keypather.get(instance, `${argument}`)
              if (result !== '') {
                return `*${argument}:* ${result}`
              }
              throw new Error('Invalid Key')
            })
      }
    }
  }

}

module.exports = RunnableApiClient
