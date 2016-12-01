const BigPoppaClient = require('@runnable/big-poppa-client')

class TestScript {
  constructor () {
    this.bigPoppa = new BigPoppaClient(process.env.BIG_POPPA_HOST)
  }

  run (orgName) {
    return this.bigPoppa.getOrganizations({ lowerName: orgName })
      .get(0)
      .tap(console.log)
      .then((bigPoppaOrg) => {
        let id = bigPoppaOrg.id
        return this.bigPoppa.updateOrganization(id, { isActive: true, hasPaymentMethod: true })
          .catch((err) => {
            console.log('Task failed when trying to update organization on BigPoppa', err)
          })
      })
  }
}

// Usage
let script = new TestScript()
script.run('sandboxdemo')
