import DogApi from 'dogapi'

class Datadog {
  constructor (config) {
    this.client = new DogApi()
    this.client.initialize(config.connection)
    this.config = config
  }

  /**
   * queries datadog for cost metrics for an org
   * @param  {String}   orgId  github org id of the org
   * @param  {Function} cb    (err, costInDollers)
   */
  getCostForOrg (orgId, cb) {
    var now = parseInt(new Date().getTime() / 1000)
    var then = now - 3600 // one hour ago
    var query = '((sum:system.mem.total{org:' + orgId + ',role:dock,env:production-delta} * 10.8) / 1046347776) + ((sum:system.disk.total{org:' + orgId + ',role:dock,env:production-delta} * 0.1) / 1072073362.9217391)'
    DogApi.metric.query(then, now, query, (err, res) => {
      console.log('getCostForOrg', res)
      cb(err, res.value)
    })
  }

  setUserCountForOrg (orgId, numUsers) {
    DogApi.metric.send('user.count', parseInt(numUsers), {
      tags: ['org:' + orgId],
      type: 'gauge'
    }, (err, results) => {
      console.log('setUserCountForOrg', orgId, numUsers, err, results)
    })
  }

}

export default Datadog
