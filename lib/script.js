const BigPoppaClient = require('@runnable/big-poppa-client')

class TestScript {
  constructor () {
    this.bigPoppa = new BigPoppaClient(process.env.BIG_POPPA_HOST)
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
let script = new TestScript()
script.run()
