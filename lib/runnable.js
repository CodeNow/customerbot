import RunnableAPIClient from '@runnable/api-client'
import promisifyClientModel from './utils/promisify-client-model'

class Runnable {

  constructor (config) {
    this.client = new RunnableAPIClient(config.apiUrl, { userContentDomain: config.userContentDomain })
    promisifyClientModel(this.client)
    this.client.githubLoginAsync(config.connection.accessToken)
  }

  fetchInstancesByOrg (orgName) {
    return this.client.fetchInstancesAsync({ githubUsername: orgName })
      .catch((err) => {
        console.log({ err: err }, err.message)
        if (err.level === 'critical') {
          throw err
        }
      })
  }

  filterInstancesByContainerName (instances, containerName) {
    return instances.models
      .filter((x) => x.attrs.name.includes(containerName))
      .map((x) => promisifyClientModel(x))[0]
  }

  fetchInstanceByOrgAndContainerName (orgName, containerName) {
    return this.fetchInstancesByOrg(orgName).bind(this)
      .then(instances => {
        return this.getInstanceAttributes(this.filterInstancesByContainerName(instances, containerName))
      })
  }

  getInstanceAttributes (instance) {
    return promisifyClientModel(instance.attrs)
  }

}

export default Runnable
