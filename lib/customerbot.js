import SlackBot from 'slackbots'
import url from 'url'
import moment from 'moment'
import octonode from 'octonode'
import Promise from 'bluebird'
import keypather from 'keypather'

import BigPoppaClient from '@runnable/big-poppa-client'
import Jira from './jira'
import Intercom from './intercom'
import Datadog from './datadog'
import Runnable from './runnable'
import Stripe from './stripe'

class CustomerBot extends SlackBot {
  constructor (config) {
    super(config.slack.connection)
    this.config = config.slack
    this.intercom = new Intercom(config.intercom)
    this.jira = new Jira(config.jira)
    this.datadog = new Datadog(config.datadog)
    this.runnable = new Runnable(config.runnable)
    this.stripe = new Stripe(config.stripe)
    this.bigpoppa = new BigPoppaClient(config.bigPoppa.host)
    this.github = octonode.client()
  }

  run () {
    console.log('CustomerBot running...')
    this.on('message', this.onMessage)
  }

  onMessage (message) {
    if (this.isChatMessage(message)) {
      let words = message.text.split(' ')
      let command = words.shift()
      message.text = words.join(' ')
      switch (command) {
        case 'help':
          console.log('Command: help')
          this.sendHelpInfo(message)
          break
        case 'feedback':
          console.log('Command: feedback')
          this.getFeedback(message)
          break
        case 'tag':
          console.log('Command: tag')
          this.tagCompany(message)
          break
        case 'hijack':
          console.log('Command: hijack')
          this.hijackCompany(message)
          break
        case 'funnel':
          console.log('Command: funnel')
          this.getFunnel(message)
          break
        case 'api':
          console.log('Command: api')
          this.getApiInfo(message)
          break
        case 'topup':
          console.log('Command: topup')
          this.extendTrial(message)
          break
        case 'deez':
          console.log('Command: deez')
          this.sendMessage('tech-mafia', ':deez:')
          break
      }
    }
  }

  sendMessage (channel, text, log) {
    this.postMessage(channel, text).fail(err => {
      console.log('Error:', err.toString)
    })

    if (log) {
      this.postMessage(this.config.logChannel, text).fail(err => {
        console.log('Error:', err.toString)
      })
    }
  }

  // Commands
  sendHelpInfo (message) {
    let command = message.text ? message.text.split(' ').shift() : ''
    switch (command) {
      case 'tag':
        this.sendMessage(message.channel, '`tag` Tag a company.\n' +
          '*Usage:*\n\t_tag <company> <ticket number> <notes>_')
        break
      case 'feedback':
        this.sendMessage(message.channel, '`feedback` Get current issues.\n')
        break
      case 'funnel':
        this.sendMessage(message.channel, '`funnel` Get funnel statistics.\n')
        break
      case 'hijack':
        this.sendMessage(message.channel, '`hijack` Moderate organization.\n' +
          '*Usage:*\n\t_hijack <company>_')
        break
      case 'api':
        this.sendMessage(message.channel, '`api` Get API info from Container URL.\n' +
          '*Usage:*\n\t_api <runnable_url> <argument>_\n' +
          '*Arguments:*\n' +
          '\t`<blank>` Returns curated list of data.\n' +
          '\t`<key>` Returns specific key/value pair.\n' +
          '\t`url` Returns API URL.\n' +
          '\t`all` Returns full JSON response from API.')
        break
      case 'topup':
        this.sendMessage(message.channel, '`topup` Add trial days to an organization.\n' +
          '*Usage:*\n\t_topup <company> <days>_')
        break
      default:
        this.sendMessage(message.channel,
          'Welcome to CustomerBot, here are the available commands:\n' +
          '\t`tag` Tag a company.\n' +
          '\t`feedback` Get current issues.\n' +
          '\t`funnel` Get funnel statistics.\n' +
          '\t`hijack` Moderate organization.\n' +
          '\t`api` Get API info from Container URL.\n' +
          '\t`topup` Add trial days to an organization.\n' +
          'Message `help <command>` for usage.')
        break
    }
  }

  getFeedback (message) {
    this.sendMessage(message.channel, 'Sending feedback shortly...')

    this.jira.searchJira('type = feedback', { maxResults: '1000' })
      .then(issue => {
        this.jira.getIssueTable(issue, this.intercom, (err, results) => {
          this.sendMessage(message.channel, this.jira.getMessageFromTable(results))
        })
      })
      .catch(err => {
        console.log(err)
        this.sendMessage(message.channel, '`Error` Something went wrong when querying JIRA. Please try again shortly.')
      })
  }

  hijackCompany (message) {
    let companyName = message.text.split(' ').shift()
    this.sendMessage(message.channel, `http://eru.runnable.io/app/org/${companyName}`)
  }

  tagCompany (message) {
    let params = message.text.split(' ')

    // Break down message
    let companyName = params.shift()
    let tag = params.shift()
    let notes = params.join(' ')

    if (companyName && tag && notes.length > 0) {
      this.intercom.getCompanyFromName(companyName, company => {
        if (company) {
          // Check tag type (i.e. JIRA ticket, basic tag)
          // TODO: CLEAN UP THIS CODE DUPLICATION
          if (this.checkForJiraTicket(tag)) {
            // Check if jira ticket is valid
            this.jira.validJiraTicket(tag, (issue) => {
              if (issue) {
                // Tag on intercom
                this.intercom.tagCompany(tag, company, (err) => {
                  if (err) {
                    console.log(err)
                    this.sendMessage(message.channel, '`Error` Something went wrong when talking to Intercom. Please try again shortly.')
                  } else {
                    this.findUserById(message.user, (username) => {
                      this.intercom.addNote(username + ' tagged this company with  ' + tag + ' because ' + notes, companyName, (info) => {
                        console.log(info)
                      })
                      this.sendMessage(message.channel, username + ' tagged ' + companyName + ' with ' + tag, true)
                    })
                  }
                })
              } else {
                this.sendMessage(message.channel, '`Error` Issue is not Filed on Jira.')
              }
            })
          } else {
            if (this.intercom.allowed_tags.find(x => x === tag) != null) {
              this.intercom.tagCompany(tag, company, (err) => {
                if (err) {
                  console.log(err)
                  this.sendMessage(message.channel, '`Error` Something went wrong when talking to Intercom. Please try again shortly.')
                } else {
                  this.findUserById(message.user, (username) => {
                    this.intercom.addNote(username + ' tagged this company with  ' + tag + ' because ' + notes, companyName, (info) => {
                      console.log(info)
                    })
                    this.sendMessage(message.channel, username + ' tagged ' + companyName + ' with ' + tag, true)
                  })
                }
              })
            } else {
              this.sendMessage(message.channel, '`Error` The tag: _' + tag + '_ is not allowed.')
            }
          }
        } else {
          this.sendMessage(message.channel, '`Error` Company not found in Intercom!')
        }
      })
    } else {
      this.sendMessage(message.channel, '`Error` Incorrect format! Please follow: tag <company name> <tag / JIRA ticket> <notes>')
    }
  }

  getFunnel (message) {
    this.sendMessage(message.channel, 'Gathering the latest funnel stats. Hang tight!')
    this.intercom.feedback.map(item => {
      this.intercom.getSegmentCount(item.intercom_id, count => {
        this.sendMessage(message.channel, item.desc + count)
      })
    })
  }

  getApiInfo (message) {
    let params = message.text.split(' ')
    let parsedURL = url.parse(params.shift().split('<').join('').split('>').join(''))
    let argument = params.shift() || null

    if (parsedURL.hostname !== 'app.runnable.io') {
      this.sendMessage(message.channel, '`Error` Invalid URL. Please use only valid urls from Runnable.io')
    } else {
      let parsedPathname = parsedURL.pathname.split('/')
      let org = parsedPathname[1]
      let container = parsedPathname[2]
      if (org !== null && container !== null) {
        switch (argument) {
          case 'url':
            let apiURL = `https://api.runnable.io/instances/?githubUsername=${org}&name=${container}`
            this.sendMessage(message.channel, apiURL)
            break
          case 'all':
            this.runnable.fetchInstanceByOrgAndContainerName(org, container)
              .then(instance => {
                this.sendMessage(message.channel, JSON.stringify(instance, null, 4))
              })
            break
          case null:
            this.runnable.fetchInstanceByOrgAndContainerName(org, container)
              .then(instance => {
                let result = `*containerID:* ${instance.container.inspect.Id}` +
                  `*containerName:* ${instance.name}` +
                  `*orgName:* ${instance.owner.username}` +
                  `*orgID:* ${instance.owner.github}` +
                  `*buildID:* ${instance.build.id}` +
                  `*buildCreated:* ${instance.build.created}` +
                  `*buildStarted:* ${instance.build.started}` +
                  `*buildCompleted:* ${instance.build.completed}` +
                  `*buildCreatedBy:* ${instance.build.createdBy.github}` +
                  `*buildFailed:* ${instance.build.failed}` +
                  `*buildDuration:* ${instance.build.duration ? new Date(instance.build.duration).getMinutes() + ' mins' : null}` +
                  `*buildHost:* ${instance.container.dockerHost ? url.parse(instance.container.dockerHost).hostname : null}`
                this.sendMessage(message.channel, result)
              })
            break
          default:
            this.runnable.fetchInstanceByOrgAndContainerName(org, container)
              .then(instance => {
                let result = keypather.get(instance, `${argument}`)
                if (result !== '') {
                  this.sendMessage(message.channel, result)
                } else {
                  this.sendMessage(message.channel, '`Error` Invalid Key')
                }
              })
        }
      } else {
        this.sendMessage(message.channel, '`Error` Invalid URL. The format is: `https://app.runnable.io/CodeNow/api-unit/`')
      }
    }
  }

  getGithubOrgFromName (company) {
    return new Promise.fromCallback(cb => {
      this.github.get(`/orgs/${company}`, {}, function (err, status, body, headers) {
        return cb(err, [status, body, headers])
      })
    })
      .then(([status, body, headers]) => body)
      .catch(err => {
        console.log(err)
        throw new Error('Cannot find organization in Github')
      })
  }

  getBigPoppaOrgFromGithubOrg (githubOrg) {
    return this.bigpoppa.getOrganizations({ githubId: githubOrg.id })
      .then(orgs => orgs[0])
      .catch(err => {
        console.log(err)
        throw new Error('Cannot find organization in Big Poppa')
      })
  }

  extendTrial (message) {
    let params = message.text.split(' ')
    if (params.length > 1) {
      let company = params.shift()
      let days = params.shift()

      this.getGithubOrgFromName(company)
        .then(org => this.getBigPoppaOrgFromGithubOrg(org))
        .then(org => {
          this.stripe.fetchCustomer(org.stripeCustomerId)
            .then(stripeCustomer => {
              let subscription = stripeCustomer.subscriptions.data[0]
              if (!subscription) {
                throw new Error('No subscription!')
              }
              return subscription
            })
            .then(subscription => {
              let oldTrialEndDate = subscription.trial_end
              this.newTrialEndDate = moment.unix(oldTrialEndDate).add(days, 'days')
              return this.stripe.updateTrialEndDate(subscription.id, this.newTrialEndDate.unix())
            })
            .then((newTrialEndDate, stripeResponse) => {
              return this.bigpoppa.updateOrganization(org.id, { trialEnd: this.newTrialEndDate.toISOString() })
            })
            .then(this.sendMessage(message.channel, `*Success:* Trial for ${company} extended by ${days} days.`))
            .then(this.sendMessage(this.config.logChannel, `Trial for ${company} extended by ${days} days.`))
            .catch(err => {
              console.log(err)
              throw new Error('Does not exist in Stripe')
            })
        })
        .catch(err => {
          console.log(err)
          this.sendMessage(message.channel, '`Error` ' + err.message)
        })
    } else {
      this.sendMessage(message.channel, '`Error` Missing company name and/or trial length (days).\n*Usage:*\n\t_topup <company> <days>_')
    }
  }

  // Helper Functions
  checkForJiraTicket (string) {
    function reverse (s) {
      return s.split('').reverse().join('')
    }

    const jiraMatcher = /\d+-[A-Z]+(?!-?[a-zA-Z]{1,10})/g
    const s = reverse(string)
    return s.match(jiraMatcher)
  }

  findUserById (id, cb) {
    this.getUsers().then((data) => {
      var found = false

      data.members.forEach((member) => {
        if (id === member.id) {
          found = true
          cb(member.name)
        }
      })
      if (!found) {
        cb(null)
      }
    })
  }

  isMentioningCustomerBot (message) {
    return message.text.toLowerCase().indexOf('cb') > -1 ||
      message.text.toLowerCase().indexOf(this.name) > -1
  }

  isFromCustomerBot (message) {
    return message.user === this.user.id
  }

  isChatMessage (message) {
    return message.type === 'message' && Boolean(message.text)
  }

  isChannelConversation (message) {
    return typeof message.channel === 'string' &&
      message.channel[0] === 'C'
  }

}

export default CustomerBot
