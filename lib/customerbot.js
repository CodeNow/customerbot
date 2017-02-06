require('loadenv')()

const Slackbot = require('slackbots')
const url = require('url')
const keypather = require('keypather')()
const Promise = require('bluebird')

const publisher = require('publisher')
const listener = require('listener')
const log = require('util/logger').child({ module: 'customerbot' })
const locale = require('../locales/en.json')

const BigPoppaClient = require('bigpoppa')
const IntercomClient = require('intercom')
const RunnableApiClient = require('runnable')

// const tag, feedback, funnel, hijack, api, topup, bp, help = {}

class CustomerBot extends Slackbot {
  constructor () {
    super({
      token: process.env.BOT_API_KEY,
      name: process.env.BOT_NAME
    })
    this.user = null
    this.bigPoppa = new BigPoppaClient()
    this.runnable = new RunnableApiClient()
    this.intercom = new IntercomClient()
  }

  run () {
    this.on('start', this._onStart)
    this.on('message', this._onMessage)
  }

  // Startup Commands
  _onStart () {
    this._loadBotUser()
    publisher.connect()
    listener.start()
    log.info('CustomerBot initialized...')
  }

  _loadBotUser () {
    this.user = this.users.filter((user) => {
      return user.name === this.name
    })[0]
    this.whiteList = this.users
      .filter((user) => {
        return process.env.SLACK_WHITELIST.indexOf(user.name) !== -1
      })
      .map((user) => {
        return user.id
      })
  }

  // Runtime Commands
  _onMessage (message) {
    if (this._filterMessage(message)) {
      return this._parseCommand(message)
        .then(response => {
          return this._sendMessage(message.channel, response)
        })
        .catch(err => {
          return this._errorMessage(message.channel, err)
        })
    }
  }

  _parseCommand (message) {
    return Promise.try(() => {
      var args = message.text.split(' ')
      var command = args.shift()
      message.text = args.join(' ')
      switch (command) {
        case 'help':
          log.info('Command: help')
          return this._sendHelpMessage(message)
        case 'api':
          log.info('Command: api')
          this._getRunnableApiInfo(message)
          break
        case 'bp':
          log.info('Command: bp')
          return this._getBigPoppaInfo(message)
        case 'disable':
          log.info('Command: disable')
          return this.bigPoppa.disableCustomer(args[0])
        case 'enable':
          log.info('Command: enable')
          return this.bigPoppa.enableCustomer(args[0])
        case 'feedback':
          log.info('Command: feedback')
          return this._getFeedback(message)
        case 'tag':
          log.info('Command: tag')
          return this.intercom.tagCompany(args[0], args[1])
        case 'test':
          return this.intercom.getCompanyFromName(args[0])
        default:
          log.info('Invalid command.')
          return locale.error.commandNotFound
      }
    })
  }

  _sendMessage (channel, text) {
    return this.postMessage(channel, text)
      .then(() => {
        log.info('Sent message:', { channel, text })
      })
      .fail(err => {
        log.error(err)
      })
  }

  _errorMessage (channel, err) {
    log.warn(err)
    return this.postMessage(channel, '`Error` ' + err.message)
  }

  // Actions
  _sendHelpMessage (message) {
    let command = message.text ? message.text.split(' ').shift() : ''
    let response = locale.help[command]
    if (!response) {
      response = locale.help.default
    }
    return response
  }

  _getFeedback (message) {
    return this.sendMessage(message.channel, 'Gathering feedback data ...')
      .then(() => {
        return this.jira.searchJira('type = feedback', { maxResults: '1000' })
          .then(issue => {
            let results = {
              problem: [],
              feedback: [],
              support: []
            }

            this.intercom.generateTagsTable()
              .then(tagsTable => {
                return issue.issues.forEach((issue) => {
                  if (tagsTable[issue.key]) {
                    if (issue.fields.labels.indexOf('problem') > -1) {
                      results['problem'].push({
                        'key': issue.key,
                        'title': issue.fields.summary,
                        'count': tagsTable[issue.key]
                      })
                    } else if (issue.fields.labels.indexOf('support') > -1) {
                      results['support'].push({
                        'key': issue.key,
                        'title': issue.fields.summary,
                        'count': tagsTable[issue.key]
                      })
                    } else {
                      results['feedback'].push({
                        'key': issue.key,
                        'title': issue.fields.summary,
                        'count': tagsTable[issue.key]
                      })
                    }
                  }

                  results['feedback'].sort((a, b) => {
                    return b.count - a.count
                  })

                  results['support'].sort((a, b) => {
                    return b.count - a.count
                  })

                  results['problem'].sort((a, b) => {
                    return b.count - a.count
                  })

                  return results
                })
              })
              .catch(err => {
                log.warn(err)
                throw new Error('Could not generate Intercom Tags table.')
              })

            this.jira.getIssueTable(issue, this.intercom, (err, results) => {
              if (err) {
                throw new Error('Could not communicate with JIRA.')
              }
              return this.jira.getMessageFromTable(results)
            })
          })
          .catch(err => {
            log.warn(err)
            throw new Error('`Error` Something went wrong when querying JIRA. Please try again shortly.')
          })
      })
  }

  _getRunnableApiInfo (message) {
    let params = message.text.split(' ')
    let parsedURL = url.parse(params.shift().split('<').join('').split('>').join(''))
    let argument = params.shift() || null

    let parsedPathname = parsedURL.pathname.split('/')
    let org = parsedPathname[1]
    let container = parsedPathname[2]
    if (org !== null && container !== null) {
      switch (argument) {
        case 'url':
          return `https://api.runnable.io/instances/?githubUsername=${org}&name=${container}`
        case null:
          return this.runnable._fetchInstanceAttributesByOrgAndContainerName(org, container)
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
          return this.runnable._fetchInstanceAttributesByOrgAndContainerName(org, container)
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

  _getBigPoppaInfo (message) {
    let params = message.text.split(' ')
    let orgName = params.shift()
    if (orgName !== null && orgName !== '') {
      return this._sendMessage(message.channel, `Gathering BigPoppa information for *${orgName}* ...`)
        .then(() => {
          return this.bigPoppa.getBigPoppaOrgFromName(orgName)
            .then((org) => {
              delete org.users // To keep Slack response message shorter
              return '```' + JSON.stringify(org, null, '  ') + '```'
            })
        })
    } else {
      throw new Error('Invalid organization name')
    }
  }

  // Helper Functions
  _filterMessage (message) {
    return this._isChatMessage(message) &&
      this._isWhiteList(message) &&
      !this._isFromCustomerBot(message)
  }

  _isChatMessage (message) {
    return message.type === 'message' && Boolean(message.text)
  }

  _isWhiteList (message) {
    if (this.whiteList.indexOf(message.user) !== -1) {
      return true
    }
    return false
  }

  _isFromCustomerBot (message) {
    return !message.user
  }

}
module.exports = CustomerBot
