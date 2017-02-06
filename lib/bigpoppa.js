const BigPoppa = require('@runnable/big-poppa-client')
const log = require('util/logger').child({ module: 'BigPoppaClient' })

class BigPoppaClient extends BigPoppa {
  constructor () {
    super(process.env.BIG_POPPA_HOST)
  }

  getBigPoppaOrgFromName (orgName) {
    return this.getOrganizations({ lowerName: orgName.toLowerCase() })
      .tap((orgs) => {
        if (orgs.length === 0) {
          throw new Error('Could not find organization in BigPoppa')
        }
      })
      .get(0)
      .catch(err => {
        log.warn(err)
        if (err.code === 'ECONNREFUSED') {
          throw new Error('Could not connect to Big Poppa!')
        }
        throw new Error('Cannot find organization in Big Poppa')
      })
  }

  getInactiveCompaniesFromBigPoppa () {
    return this.getOrganizations()
      .tap(orgs => {
        if (!orgs) {
          throw new Error('Could not fetch orgs from bigPoppa')
        }
      })
      .then(orgs => {
        return orgs
          .filter((o) => (!o.allowed))
      })
  }

  disableCustomer (orgName) {
    return this.getBigPoppaOrgFromName(orgName)
      .then(org => this.updateOrganization(org.id, { isActive: false }))
      .then()
  }

  enableCustomer (orgName) {
    return this.getBigPoppaOrgFromName(orgName)
      .then(org => this.updateOrganization(org.id, { isActive: true }))
      .then(() => `${orgName} successfully enabled.`)
      .catch(err => {
        log.warn(err)
        throw new Error(`Could not disable ${orgName}!`)
      })
  }

}
module.exports = BigPoppaClient
