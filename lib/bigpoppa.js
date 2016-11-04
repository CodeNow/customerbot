import octonode from 'octonode'
import Promise from 'bluebird'
import BigPoppaClient from '@runnable/big-poppa-client'

class BigPoppa {
  constructor (config) {
    this.client = new BigPoppaClient(config.host)
    this.github = octonode.client(config.githubAccessToken)
  }

  getBigPoppaOrgFromName (orgName) {
    return this.client.getOrganizations({ lowerName: orgName.toLowerCase() })
      .tap((orgs) => {
        if (orgs.length === 0) {
          throw new Error('Could not find organization in BigPoppa')
        }
      })
      .get(0)
  }

  getGithubOrgFromName (company) {
    return Promise.fromCallback(cb => {
      if (!company || company.length < 1) {
        throw new Error('Company name not supplied')
      }
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
    return this.client.getOrganizations({ githubId: githubOrg.id })
      .then(orgs => orgs[0])
      .catch(err => {
        console.log(err)
        throw new Error('Cannot find organization in Big Poppa')
      })
  }

  getInactiveCompaniesFromBigPoppa () {
    return this.client.getOrganizations()
      .tap(orgs => {
        if (orgs) {
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
      .then(org => this.client.updateOrganization(org.id, { isActive: false }))
  }

  enableCustomer (orgName) {
    return this.getBigPoppaOrgFromName(orgName)
      .then(org => this.client.updateOrganization(org.id, { isActive: true }))
  }

}

export default BigPoppa
