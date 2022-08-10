const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')

class SMS {
  init () {}

  /**
   * Gets an Asset by id
   * 
   * @param {int} assetId ex. 5692
   * @returns 
   */
  async getAssetContent(assetId) {
    let url = `${this.parent.restEndpoint}/asset/v1/assets/${assetId}`

    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  /**
   * Get Rendered SMS Content
   * 
   * @param {options} 
   *   options.content {string} The SMS content which contains the ampscrips
   *   options.deCustomerKey {string} The data extension customer key
   *   options.deRowId {int} The row id of the data extension
   * @returns {renderingServiceLogID, renderedContent, contentFieldsNotFound}
   */
  async render({content, deCustomerKey, deRowId}) {
    let url = `${this.parent.restEndpoint}/messaging/v1/sms/render`

    let response = await axios.post(url, {
      "context": "preview",
      "content": content,
      "messageType": "sms",
      "dataExtension": {
        "customerKey": deCustomerKey,
        "row": deRowId
      }
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }
}

module.exports = SMS