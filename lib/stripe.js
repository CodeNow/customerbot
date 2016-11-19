import StripeClient from 'stripe'

class Stripe {
  constructor () {
    this._stripe = new StripeClient(process.env.STRIPE_SECRET_KEY)
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
