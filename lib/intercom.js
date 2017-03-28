const Promise = require('bluebird')
const Orion = require('@runnable/orion')
const log = require('util/logger').child({ module: 'intercom' })

class IntercomClient {

  constructor () {
    this.feedback = [{
      intercom_id: '570fd849c04953a148000055',
      name: 'norepo',
      desc: 'Users with No Repo Containers: '
    }, {
      intercom_id: '57150d1121e024d1e6000034',
      name: 'norepo',
      desc: 'Users with 1+ Repo Containers but who are *not* setup: '
    }, {
      intercom_id: '571573d2dceccc2974000086',
      name: 'setup',
      desc: 'Users in Setup: '
    }]
  }

  getTagCount (tag) {
    return Orion.companies.listBy({ tag_id: tag.id })
      .get('total_count')
      .catch(err => {
        throw new Error(err.message)
      })
  }

  filterJiraTickets (tags) {
    if (!tags) {
      throw new Error('Could not fetch tags from Intercom!')
    }
    return tags.filter(tag => {
      return (tag.name.indexOf('SAN-') !== -1 || tag.name.indexOf('SUP-') !== -1 || tag.name.indexOf('GTM-') !== -1)
    })
  }

  formatTagsWithCount (tags) {
    let formattedTags = tags.reduce((formattedTags, tag) => {
      formattedTags[tag.name] = this.getTagCount(tag)
      return formattedTags
    }, {})
    return Promise.props(formattedTags)
  }

  getFeedbackTags (jiraIssues) {
    return Orion.tags.list()
      .get('tags')
      .then(tags => this.filterJiraTickets(tags))
      .then(filteredTags => this.formatTagsWithCount(filteredTags))
      .catch(err => {
        throw new Error(err.message)
      })
  }

  sortResults (results) {
    results['feedback'].sort((a, b) => b.count - a.count)
    results['support'].sort((a, b) => b.count - a.count)
    results['problem'].sort((a, b) => b.count - a.count)
    return results
  }

  tagCompany (message) {
    let orgName = message.args[0]
    let tag = message.args[1]
    if (tag && tag !== '') {
      return this.getCompanyFromName(orgName)
        .then(company => {
          return Orion.tags.tag({
            name: tag,
            companies: [{
              id: company.id
            }]
          })
        })
        .then(res => {
          log.info(res)
          return `*${orgName}* successfully tagged with: *${tag}*`
        })
        .catch(err => {
          log.warn(err)
          throw new Error(`Could not apply tag: *${tag}* to *${companyName}* on Intercom`)
        })
    }
    throw new Error('Missing or invalid tag!')
  }

  getCompanyFromName (companyName) {
    return Orion.companies.listBy({ name: companyName })
  }
}

module.exports = IntercomClient
