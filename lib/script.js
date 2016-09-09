import stripe from 'stripe'
import moment from 'moment'
import octonode from 'octonode'
import Promise from 'bluebird'
import keypather from 'keypather'
import BigPoppaClient from '@runnable/big-poppa-client'


function promiseWhile (condition, action) {
  function loop (data) {
    if (condition(data)) { return Promise.resolve(data) }
    return action(data).then(loop)
  }
  return loop
}

class Thing {
  constructor (config) {
    this._stripe = new stripe(config.secret_key)
    this.bigpoppa = new BigPoppaClient(config.bigPoppa.host)
    this.github = octonode.client()
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

  updateTrialEndDate (subscriptionId, newTrialDate) {
    return this._stripe.subscriptions.update(subscriptionId, { trial_end: newTrialDate })
  }

  fetchCustomer (stripeCustomerId) {
    return this._stripe.customers.retrieve(stripeCustomerId)
  }

  disableCustomer (orgName) {
    return this.getGithubOrgFromName(orgName)
      .then(org => this.getBigPoppaOrgFromGithubOrg(org))
      .then(org => this.bigpoppa.updateOrganization(org.id, { isActive: false }))
      .then(console.log(`${orgName} has been disabled.`))
      .catch(err => console.lorg(err))
  }

  enableCustomer (orgName) {
    return this.getGithubOrgFromName(orgName)
      .then(org => this.getBigPoppaOrgFromGithubOrg(org))
      .then(org => this.bigpoppa.updateOrganization(org.id, { isActive: true }))
      .then(console.log(`${orgName} has been enabled.`))
      .catch(err => console.lorg(err))
  }

  listCustomers () {
    let lastCustomer = null
    return this._stripe.customers.list()
      .then(({ data, has_more }) => ({ data, has_more }))
      .then(promiseWhile(
        (res) => (res.has_more),
        (res) => {
          let query = lastCustomer ? { starting_after: lastCustomer.id } : {}
          return this._stripe.customers.list(query)
            .then(list => {
              Array.prototype.push.apply(res.data, list.data)
              lastCustomer = list.data.pop()
              return res
            })
        }
      ))
      .then(console.log)
  }

}

import config from '../config.js'
let client = new Thing(config)

// client.listCustomers()
// client.disableCustomer('Runnable')
client.enableCustomer('Runnable')
