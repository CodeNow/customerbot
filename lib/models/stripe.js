const StripeClient = require('stripe')

class Stripe extends StripeClient {
  constructor () {
    super(process.env.STRIPE_SECRET_KEY)
  }

  updateTrialEndDate (subscriptionId, newTrialDate) {
    return this.subscriptions.update(subscriptionId, { trial_end: newTrialDate })
  }

  fetchCustomer (stripeCustomerId) {
    return this.customers.retrieve(stripeCustomerId)
  }

  listCustomers () {
    return this.customers.list({limit: 3})
  }

}

module.exports = Stripe
