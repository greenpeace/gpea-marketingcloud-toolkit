const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")

class Messaging {
  /**
   * getMessageSendsCollection
   * Returns all message sends for authenticated account
   * 
   * Note: This endpoint only retrieve emails of journeys. Guided send is not included.
   */
  async getMessageSendsCollection() {
    let pageNo = 1

    while (true) {
      console.log('page', pageNo)

      let url = `${this.parent.restEndpoint}/messaging/v1/messageSends?$page=${pageNo}`
      let response = await axios.get(url, {
        headers: { "authorization": `Bearer ${this.parent.accessToken}` }
      })
      
      let hasNext = _.get(response.data, 'links.next.href')
      let items = _.get(response.data, 'items')

      items.forEach((item, idx) => {
        console.log(`${item.name} ${item.subject.subject} ${item.createdDate}`)
      })

      if (hasNext) {
        pageNo += 1
      } else {
        break
      }
    }
  }
}

module.exports = Messaging