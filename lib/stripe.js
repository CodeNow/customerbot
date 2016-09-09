import stripe from 'stripe'

class Stripe {
  constructor (config) {
    this._stripe = new stripe(config.secret_key)
  }

  updateTrialEndDate (subscriptionId, newTrialDate) {
    return this._stripe.subscriptions.update(subscriptionId, { trial_end: newTrialDate })
  }

  fetchCustomer (stripeCustomerId) {
    return this._stripe.customers.retrieve(stripeCustomerId)
  }

  listCustomers () {
    return this._stripe.customers.list({limit: 3})
  }

}

export default Stripe
