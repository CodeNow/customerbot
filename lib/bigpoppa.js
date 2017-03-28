const BigPoppa = require('@runnable/big-poppa-client')
const StripeClient = require('stripe')

const log = require('util/logger').child({ module: 'BigPoppaClient' })

const moment = require('moment')

class BigPoppaClient extends BigPoppa {
  constructor () {
    super(process.env.BIG_POPPA_HOST)
    this.stripe = new StripeClient()
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
      .then(() => `${orgName} successfully disable.`)
      .catch(err => {
        log.warn(err)
        throw new Error(`Could not disable ${orgName}!`)
      })
  }

  enableCustomer (orgName) {
    return this.getBigPoppaOrgFromName(orgName)
      .then(org => this.updateOrganization(org.id, { isActive: true }))
      .then(() => `${orgName} successfully enabled.`)
      .catch(err => {
        log.warn(err)
        throw new Error(`Could not enable ${orgName}!`)
      })
  }

  extendTrial (message) {
    if (message.args.length > 0) {
      let orgName = message.args[0]
      let days = message.args[1]

      return this.getBigPoppaOrgFromName(orgName)
        .then(org => {
          if (!org) {
            throw new Error(`${orgName} not found in BigPoppa`)
          }
          return this.stripe.fetchCustomer(org.stripeCustomerId)
        })
        .then(customer => {
          if (!customer) {
            throw new Error(`Could not find ${orgName} in Stripe`)
          }
          return customer.subscriptions.data[0]
        })
        .then(subscription => {
          if (!subscription) {
            // Create new subscription
            throw new Error('No subscription!')
          }
          let oldTrialEndDate = subscription.trial_end ? subscription.trial_end : moment()
          this.newTrialEndDate = moment.unix(oldTrialEndDate).add(days, 'days')
          return this.stripe.updateTrialEndDate(subscription.id, this.newTrialEndDate.format('X'))
        })
        .then((newTrialEndDate, stripeResponse) => {
          return this.bigpoppa.client.updateOrganization(org.id, { trialEnd: this.newTrialEndDate.toISOString() })
        })
        .then(() => this.sendMessage(message.channel, `Trial for ${company} extended by ${days} days.`, true))
        .catch(err => {
          log.error(err)
          throw new Error('Could not connect to Big Poppa!')
        })
    } 
    throw new Error('Missing company name and/or trial length (days).\n*Usage:*\n\t_topup <company> <days>_')
  }

  getOrgInfo (message) {
    let orgName = message.args[0]
    if (orgName !== null && orgName !== '') {
      return this._sendMessage(message.channel, `Gathering BigPoppa information for *${orgName}* ...`)
        .then(() => {
          return this.getBigPoppaOrgFromName(orgName)
            .then((org) => {
              delete org.users // To keep Slack response message shorter
              return '```' + JSON.stringify(org, null, '  ') + '```'
            })
        })
    }
    throw new Error('Invalid organization name')
  }

}
module.exports = BigPoppaClient
