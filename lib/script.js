const BigPoppaClient = require('@runnable/big-poppa-client')

class TestScript {
  constructor (config) {
    this.bigPoppa = new BigPoppaClient(config.bigPoppa.host)
  }

  run () {
    return this.bigPoppa.getOrganizations()
      .then((orgs) => {
        return orgs
          .filter((o) => ((o.lowerName.indexOf('p4l-') !== -1) && (o.isActive === true)))
          .map((o) => (o.id))
      })
      .get(0)
      .tap(console.log)
      .then((bigPoppaId) => {
        return this.bigPoppa.updateOrganization(bigPoppaId, { isActive: false })
          .catch((err) => {
            console.log('Task failed when trying to update organization on BigPoppa', err)
          })
      })
  }
}

// Usage
import config from '../config.js'
let script = new TestScript(config)
script.run()
