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

  unsubscribeFromIntercomEmails (message) {
    // Grab user object from Intercom
    // Set unsubscribed_from_emails to false
  }

  getTagCount (tagId) {
    return Orion.companies.listBy({ tag_id: tagId })
      .then((res) => {
        return res.body.total_count
      })
      .catch(err => {
        throw new Error(err.message)
      })
  }

  generateTagsTable (cb) {
    let r = {}

    return Orion.tags.list()
      .then((response) => response.body.tags)
      .then((list) => {
        return list.map((tag) => {
          if (tag.name.indexOf('SAN-') !== -1) {
            return this.getTagCount(tag.id)
              .then(count => {
                r[tag.name] = count
              })
          }
        })
          .then(() => {
            return r
          })
      })
      .catch(err => {
        throw new Error(err.message)
      })
  }

  tagCompany (companyName, tag) {
    if (tag && tag !== '') {
      return this.getCompanyFromName(companyName)
        .then(company => {
          return Orion.tags.create({
            name: tag,
            companies: [{
              id: company.id
            }]
          })
          .then(res => {
            log.info(res)
            return `${company} successfully tagged with: ${tag}`
          })
        })
        .catch(err => {
          log.warn(err)
          throw new Error(`Could not apply tag: *${tag}* to *${companyName}* on Intercom`)
        })
    }
    throw new Error('Missing or invalid tag!')
  }

  getCompanyFromName (companyName) {
    return Orion.companies.list()
      // .then(res => {
      //   if (!res) {
      //     throw new Error('Failed to find orgs in Intercom.')
      //   }
      //   var companies = []

      //   function getAllCompanies (page) {
      //     page.companies.map((company) => {
      //       companies.push(company)
      //     })
      //     if (page.pages.page < page.pages.total_pages) {
      //       return Orion.nextPage(page.pages)
      //         .then((nextPage) => {
      //           return getAllCompanies(nextPage)
      //         })
      //     } else {
      //       return companies
      //     }
      //   }
      //   return getAllCompanies(res)
      // })
      .then(companies => {
        console.log(companies)
        return companies.filter((company) => {
          return company.name.toLowerCase() === companyName.toLowerCase()
        })
      })
      .get([0])
  }

  addNote (message, companyName, cb) {
    this.users.find({
      user_id: 'navi-' + companyName
    }, (err, res) => {
      if (err) {
        // navi user does not exist; skipping notes.
        cb('navi user does not exist, skipping')
      } else {
        // Create a note
        let note = {
          admin_id: 22382,
          body: message,
          id: res.body.id
        }

        this.notes.create(note, (res2) => {
          if (res2.status === 200) {
            cb('successfully added note')
          } else {
            cb('ran into an error adding the note')
          }
        })
      }
    })
  }
}

module.exports = IntercomClient
