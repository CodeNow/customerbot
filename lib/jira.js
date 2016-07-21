import JiraClient from 'jira-client'

class Jira extends JiraClient {
  constructor (config) {
    super(config.connection)
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

  getIssueTable (issues, intercom, cb) {
    let results = {}
    results['problem'] = []
    results['feedback'] = []
    results['support'] = []

    intercom.generateTagsTable((err, tagsIntercom) => {
      if (err) {
        cb(err, null)
      }

      issues.issues.forEach((issue) => {
        if (tagsIntercom[issue.key]) {
          if (issue.fields.labels.indexOf('problem') > -1) {
            results['problem'].push({
              'key': issue.key,
              'title': issue.fields.summary,
              'count': tagsIntercom[issue.key]
            })
          } else if (issue.fields.labels.indexOf('support') > -1) {
            results['support'].push({
              'key': issue.key,
              'title': issue.fields.summary,
              'count': tagsIntercom[issue.key]
            })
          } else {
            results['feedback'].push({
              'key': issue.key,
              'title': issue.fields.summary,
              'count': tagsIntercom[issue.key]
            })
          }
        }
      })

      results['feedback'].sort((a, b) => {
        return b.count - a.count
      })

      results['support'].sort((a, b) => {
        return b.count - a.count
      })

      results['problem'].sort((a, b) => {
        return b.count - a.count
      })

      cb(null, results)
    })
  }

}

export default Jira
