require('loadenv')()

const Slackbot = require('slackbots')
const Promise = require('bluebird')

const publisher = require('models/publisher')
const listener = require('models/listener')
const log = require('util/logger').child({ module: 'customerbot' })
const locale = require('../locales/en.json')
const sort = require('util/sort')

const BigPoppaClient = require('bigpoppa')
const IntercomClient = require('intercom')
const JiraClient = require('jira')
const RunnableApiClient = require('runnable')

class CustomerBot extends Slackbot {
  constructor () {
    super({
      token: process.env.BOT_API_KEY,
      name: process.env.APP_NAME
    })
    this.user = null
    this.bigpoppa = new BigPoppaClient()
    this.intercom = new IntercomClient()
    this.jira = new JiraClient()
    this.runnable = new RunnableApiClient()
  }

  run () {
    this.on('start', this.onStart)
    this.on('message', this.onMessage)
  }

  // Startup Commands
  onStart () {
    this.loadBotUser()
    publisher.connect()
    listener.start()
    log.info('CustomerBot initialized...')
  }

  loadBotUser () {
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
  onMessage (message) {
    let filteredMessage = this.filterMessage(message)
    if (filteredMessage) {
      return this.parseCommand(filteredMessage)
        .then(response => this.sendMessage(message.channel, response))
        .catch(err => this.errorMessage(message.channel, err))
    }
  }

  parseCommand (message) {
    return Promise.try(() => {
      switch (message.command) {
        case 'api':
          log.info('Command: api')
          return this.runnable.getApiInfo(message)
        case 'bp':
          log.info('Command: bp')
          return this.bigpoppa.getOrgInfo(message)
        case 'disable':
          log.info('Command: disable')
          return this.bigpoppa.disableCustomer(message.args[0])
        case 'enable':
          log.info('Command: enable')
          return this.bigpoppa.enableCustomer(message.args[0])
        case 'feedback':
          log.info('Command: feedback')
          return this.getFeedback(message)
        case 'help':
          log.info('Command: help')
          return this.sendHelpMessage(message)
        case 'tag':
          log.info('Command: tag')
          return this.intercom.tagCompany(message)
        case 'topup':
          log.info('Command: topup')
          return this.bigpoppa.extendTrial(message)
        case 'test':
          log.info('Command: test')
          return this.intercom.getAllCompanies(message)
        default:
          log.info('Invalid command.')
          return locale.error.commandNotFound
      }
    })
  }

  sendMessage (channel, text) {
    return this.postMessage(channel, text)
      .then(() => {
        log.info('Sent message:', { channel, text })
      })
      .fail(err => {
        log.error(err)
      })
  }

  errorMessage (channel, err) {
    log.warn(err)
    return this.postMessage(channel, '`Error` ' + err.message)
  }

  // Actions
  sendHelpMessage (message) {
    if (message.args[0]) {
      return locale.help[message.args[0]]
    }
    return locale.help.default
  }

  getFeedback (message) {
    const getKey = (names) => {
      if (names.indexOf('problem')) return 'problem'
      if (names.indexOf('support')) return 'support'
      return 'feedback'
    }
    return Promise.try(() => {
      this.sendMessage(message.channel, 'Gathering feedback data ...')
      return [ this.jira.getFeedbackIssues(), this.intercom.getFeedbackTags() ]
    })
    .spread((issues, tags) => {
      let results = { problem: [], feedback: [], support: [] }
      issues.forEach(issue => {
        if (tags[issue.key]) {
          const entry = {
            'key': issue.key,
            'title': issue.fields.summary,
            'count': tags[issue.key]
          }
          results[getKey(issue.fields.labels)].push(entry)
        }
      })
      Object.keys(results).forEach(key => {
        results[key].sort(sort)
      })
      return results
    })
    .then(table => this.jira.getMessageFromTable(table))
    .catch(err => {
      log.warn(err)
      throw new Error('Something went wrong when querying JIRA. Please try again shortly.')
    })
  }

  // Helper Functions
  filterMessage (message) {
    if (this.isChatMessage(message) && this.isWhiteList(message) &&
    this.isMentioningCustomerBot(message) && !this.isFromCustomerBot(message)) {
      var words = message.text.split(' ')
      message.to = words.shift()
      message.command = words.shift()
      message.args = words
      return message
    }
    return null
  }

  isChatMessage (message) {
    return message.type === 'message' && Boolean(message.text)
  }

  isWhiteList (message) {
    return this.whiteList.indexOf(message.user) !== -1
  }

  isMentioningCustomerBot (message) {
    return (message.text.indexOf('cb ') !== -1 || message.text.indexOf(this.user.id) !== -1)
  }

  isFromCustomerBot (message) {
    return !message.user
  }

}
module.exports = CustomerBot
