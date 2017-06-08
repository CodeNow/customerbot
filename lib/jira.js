const JiraClient = require('jira-client')

class Jira extends JiraClient {
  constructor () {
    super({
      protocol: 'https',
      host: 'runnable.atlassian.net',
      username: process.env.JIRA_USERNAME,
      password: process.env.JIRA_PASSWORD,
      apiVersion: '2',
      strictSSL: true
    })
  }

  getFeedbackIssues () {
    return this.searchJira('type = feedback', { maxResults: '1000' })
      .then(res => {
        if (!res.issues) {
          throw new Error('No feedback issues found in JIRA!')
        }
        return res.issues
      })
  }

  validJiraTicket (tag, callback) {
    this.findIssue(tag)
      .then(issue => {
        callback(issue)
      })
      .catch(err => {
        console.log('Error:', err)
        callback(err)
      })
  }

  getMessageFromTable (table) {
    let results = '*Here are the problems that we have no work around for*\n'

    table['problem'].forEach((problem) => {
      results += '<https://runnable.atlassian.net/browse/' + problem['key'] + '|' + problem['key'] + '>' + '\t' +
        problem['title'] + '\t' +
        problem['count'] + ' companies\n'
    })

    results += '\n\n*Here are the onboarding roblems that support had to help with*\n'

    table['support'].forEach((problem) => {
      results += '<https://runnable.atlassian.net/browse/' + problem['key'] + '|' + problem['key'] + '>' + '\t' +
        problem['title'] + '\t' +
        problem['count'] + ' companies\n'
    })

    results += '\n\n*Here is the feedback users have been giving us*\n'

    table['feedback'].forEach((problem) => {
      results += '<https://runnable.atlassian.net/browse/' + problem['key'] + '|' + problem['key'] + '>' + '\t' +
        problem['title'] + '\t' +
        problem['count'] + ' companies\n'
    })

    return results
  }

}

module.exports = Jira
