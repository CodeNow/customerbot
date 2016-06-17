import SlackBot from 'slackbots'

import Jira from './jira'
import Intercom from './intercom'
import Datadog from './datadog'

class CustomerBot extends SlackBot {
    constructor(config) {
        super(config.slack.connection)
        this.config = config.slack
        this.intercom = new Intercom(config.intercom)
        this.jira = new Jira(config.jira)
        this.datadog = new Datadog(config.datadog)
    }

    run() {
        console.log('CustomerBot running...')
        this.on('message', this.onMessage)
    }

    onMessage(message) {
        if (this.isChatMessage(message)) {
            let words = message.text.split(' ')
            let command = words.shift()
            message.text = words.join(' ')
            switch (command) {
            case 'help':
                console.log('Command: help')
                this.sendMessage(message.channel, 'Welcome to CustomerBot, here are the available commands:\n`tag` Tag a company. _tag <company> <ticket number> <notes>_\n`feedback` Get current issues.\n`funnel` Get funnel statistics.')
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
            case 'sonic':
                console.log('Command: funnel')
                this.sendMessage(message.channel, '@praful `Not bad, Sonic!`')
                break
            case 'funnel':
                console.log('Command: funnel')
                this.getFunnel(message)
                break
            default:
                // console.log('Unknown command.')
                // this.sendMessage(message.channel, '`Error` Sorry, I do not understand this command. Type _help_ for available commands.')
            }
        }
    }

    sendMessage(channel, text, log) {
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
    getFeedback(message) {
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

    hijackCompany(message) {
        let companyName = message.text.split(' ').shift()
        this.sendMessage(message.channel, `http://eru.runnable.io/app/org/${companyName}`)
    }

    tagCompany(message) {
        let params = message.text.split(' ')

        // Break down message
        let companyName = params.shift()
        let tag = params.shift()
        let notes = params.join(' ')

        if (companyName && tag && notes.length > 0) {
            this.intercom.getCompanyFromName(companyName, company => {
                if(company) {
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
                                            this.intercom.addNote(username + ' tagged this company with  ' + tag + ' because ' + notes, companyName, (info) => { console.log(info) })
                                            this.sendMessage(message.channel, username + ' tagged ' + companyName + ' with ' + tag, true)
                                        })
                                    }
                                })
                            } else {
                                this.sendMessage(message.channel, '`Error` Issue is not Filed on Jira.')
                            }
                        })
                    } else {
                        if (this.intercom.allowed_tags.find(x => x == tag) != null) {
                            this.intercom.tagCompany(tag, company, (err) => {
                                if (err) {
                                    console.log(err)
                                    this.sendMessage(message.channel, '`Error` Something went wrong when talking to Intercom. Please try again shortly.')
                                } else {
                                    this.findUserById(message.user, (username) => {
                                        this.intercom.addNote(username + ' tagged this company with  ' + tag + ' because ' + notes, companyName, (info) => { console.log(info) })
                                        this.sendMessage(message.channel, username + ' tagged ' + companyName + ' with ' + tag, true)
                                    })
                                }
                            })
                        } else {
                            this.sendMessage(message.channel, `\`Error\` The tag: _${tag}_ is not allowed.`)
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

    getFunnel(message) {
        this.sendMessage(message.channel, 'Gathering the latest funnel stats. Hang tight!')
        // this.intercom.gatherFunnelStatistics(message, this.sendMessage )

        this.intercom.feedback.map(item => {
            this.intercom.getSegmentCount(item.intercom_id, count => {
                this.sendMessage(message.channel, item.desc + count)
            })
        })
    }

    // Helper Functions
    checkForJiraTicket(string) {
        function reverse(s) {
            return s.split('').reverse().join('')
        }

        const jira_matcher = /\d+-[A-Z]+(?!-?[a-zA-Z]{1,10})/g
        const s = reverse(string)
        return s.match(jira_matcher)
    }

    findUserById(id, cb) {
        this.getUsers().then((data) => {
            var found = false

            data.members.forEach((member) => {
                if (id == member.id) {
                    found = true
                    cb(member.name)
                }
            })
            if (!found)
                cb(null)
        })
    }

    isMentioningCustomerBot(message) {
        return message.text.toLowerCase().indexOf('cb') > -1 ||
            message.text.toLowerCase().indexOf(this.name) > -1
    }

    isFromCustomerBot(message) {
        return message.user === this.user.id
    }

    isChatMessage(message) {
        return message.type === 'message' && Boolean(message.text)
    }

    isChannelConversation(message) {
        return typeof message.channel === 'string' &&
            message.channel[0] === 'C'
    }

}

export
default CustomerBot