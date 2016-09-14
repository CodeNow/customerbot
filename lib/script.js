import Stripe from 'stripe'
import octonode from 'octonode'
import Promise from 'bluebird'
// import BigPoppaClient from '@runnable/big-poppa-client'
import hasProps from '101/has-properties'
import aws from 'aws-sdk'
import _ from 'lodash'

import BigPoppa from './bigpoppa'
import ansible from './ansible'
import rabbit from './rabbit'

function promiseWhile (condition, action) {
  function loop (data) {
    if (condition(data)) { return Promise.resolve(data) }
    return action(data).then(loop)
  }
  return loop
}

class Thing {
  constructor (config) {
    this._stripe = new Stripe(config.stripe.secret_key)
    // this.bigPoppa = new BigPoppaClient(config.bigPoppa.host)
    this.bigPoppa = new BigPoppa(config.bigPoppa)
    this.github = octonode.client()
  }

  // Github
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

  // AWS
  asg (options) {
    options._name = ['aws_access_key_id', 'aws_secret_access_key']
    return ansible.all(options)
      .then(function (config) {
        return new aws.AutoScaling({
          accessKeyId: config.aws_access_key_id,
          secretAccessKey: config.aws_secret_access_key,
          region: options.env === 'production'
            ? 'us-west-1'
            : 'us-west-2'
        })
      })
  }

  listAutoScalingGroups (options) {
    return this.asg(options)
      .then(function (asg) {
        return Promise.resolve({ groups: [] })
          .then(promiseWhile(
            function (data) { return data.done },
            function (data) {
              var query = {}
              if (data.nextToken) { query.NextToken = data.nextToken }
              return Promise.fromCallback(function (callback) {
                asg.describeAutoScalingGroups(query, callback)
              })
                .then(function (result) {
                  Array.prototype.push.apply(data.groups, result.AutoScalingGroups)
                  data.nextToken = result.NextToken
                  if (!data.nextToken) { data.done = true }
                  return data
                })
            }
          ))
          .then(function (data) {
            return data.groups
          })
      })
      .then(function (groups) {
        var env = options.env
        return groups.filter(function (group) {
          if (!group.Tags.find(hasProps({ Key: 'org' }))) { return false }
          if (!group.Tags.find(hasProps({ Key: 'env' }))) { return false }
          return true
        })
          .map(function (group) {
            return {
              name: group.AutoScalingGroupName,
              org: group.Tags.find(hasProps({ Key: 'org' })).Value,
              env: group.Tags.find(hasProps({ Key: 'env' })).Value,
              launchConfiguration: group.LaunchConfigurationName,
              min: group.MinSize,
              max: group.MaxSize,
              desired: group.DesiredCapacity,
              cooldown: group.DefaultCooldown,
              created: group.CreatedTime
            }
          }).filter(function (group) {
            return group.env === 'production-' + env
          })
      })
  }

  // Stripe
  updateTrialEndDate (subscriptionId, newTrialDate) {
    return this._stripe.subscriptions.update(subscriptionId, { trial_end: newTrialDate })
  }

  fetchCustomer (stripeCustomerId) {
    return this._stripe.customers.retrieve(stripeCustomerId)
  }

  listCustomersFromStripe () {
    let lastCustomer = null
    return this._stripe.customers.list()
      .then(({ data, has_more }) => ({data, has_more}))
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
  }

  // RabbitMQ
  sendKillAsgMessage (githubOrgId, environment) {
    var data = {
      MinSize: 0,
      DesiredCapacity: 0,
      MaxSize: 0
    }

    return rabbit.publish('update', { githubId: githubOrgId, data: data }, { env: environment })
  }

  // Higher Level Functinos
  getStripeIdFromOrgName (orgName) {
    return this.getGithubOrgFromName(orgName)
      .then(org => this.getBigPoppaOrgFromGithubOrg(org))
      .then(console.log)
  }

  killAsgsForInactiveCompanies (environment) {
    return this.bigPoppa.getInactiveCompaniesFromBigPoppa()
      .then((orgs) => {
        let inactiveOrgIds = orgs.map((o) => (o.githubId))
        return this.listAutoScalingGroups({ env: environment })
          .then((groups) => {
            let activeAsgOrgIds = groups
              .filter((asg) => (asg.desired > 0))
              .map((asg) => (parseInt(asg.org)))
            return { inactiveOrgIds, activeAsgOrgIds }
          })
      })
      .then(({inactiveOrgIds, activeAsgOrgIds}) => {
        return _.intersection(inactiveOrgIds, activeAsgOrgIds)
      })
      .tap((orgs) => (console.log(orgs.length)))
      .then((orgs) => {
        return Promise.all(
          orgs.map((org) =>
            client.sendKillAsgMessage(org.toString(), environment)
          )
        )
          .catch(console.log)
      })
      .then(() => { return 'Done' })
  }

}

// Usage
import config from '../config.js'
let client = new Thing(config)

client.listAutoScalingGroups({env: 'delta'})
  .then((groups) => console.log(groups[0]))

// client.getStripeIdFromOrgName('RunnableFailOverTest')
// client.listCustomersFromStripe()
// client.killAsgsForInactiveCompanies('gamma')
// client.sendKillAsgMessage('88', 'gamma')
//   .then(console.log)
