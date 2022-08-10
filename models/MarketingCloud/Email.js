const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')


/**
 * Deal with Email Sends and Previews, Tests
 * 
 * @see https://gortonington.com/email-send-preview-and-test-sends-via-rest-api/
 */
class Email {
  init () {
    this.sendManagement = {}
    if (this.parent.market==="tw") {
      this.sendManagement = {
        sendClassificationID: process.env.MC_TW_sendClassificationID,
        senderProfileID: process.env.MC_TW_senderProfileID,
        deliveryProfileID: process.env.MC_TW_deliveryProfileID,
      }
    } else if (this.parent.market==="hk") {
      this.sendManagement = {
        sendClassificationID: process.env.MC_HK_sendClassificationID,
        senderProfileID: process.env.MC_HK_senderProfileID,
        deliveryProfileID: process.env.MC_HK_deliveryProfileID,
      }
    } else {
      throw new Error("Un-support market: ", this.parent.market)
    }
  }

  /**
   * Find the email object bu the given emailId
   * 
   * @param {int} emailId ex. 8484
   * @returns 
   */
  async findEmailByLegacyEmailId (emailId) {
    let url = `${this.parent.restEndpoint}/asset/v1/content/assets/query`

    let response = await axios.post(url, {
      "query": {
        "property": "data.email.legacy.legacyId",
        "simpleOperator": "equal",
        "value": emailId
      }
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return _.get(response.data, 'items')
  }

  /**
   * Get a preview for an email by id using a specific data extension and data extension row.
   * 
   * @param {int} emailId ex. 8484
   * @param {string} deId Data Extension Id (ObjectId): ex 38c76ffa-b40f-ec11-b85c-b883035b8991
   * @param {int} rowId Row _CustomObjectKey. Note, it's not the table index, it's a row Id. ex. 39679
   * @returns 
   */
  async generatePreviewHtmlByDeRowId(emailId, deId, rowId) {
    let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/dataExtension/${deId}/row/${rowId}/preview`

    let response = await axios.post(url, {}, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return this._extractHtmlBodyFromPreviewResponseData(response.data)
  }

  /**
   * Sends a preview of an email.
   * 
   * @param {int} emailId 
   * @param {string} deId 
   * @param {int} rowId 
   * @param {mixed} recipients Array of Emails OR a email string
   * @returns 
   */
  async postEmailPreviewSend({emailId, deId, rowId, recipients, subjectPrefix, senderProfileId, deliveryProfileId}) {
    // resolve the sender settings
    let sendManagement = Object.assign({}, this.sendManagement)
    if (senderProfileId) {
      sendManagement.senderProfileId = senderProfileId
    }
    if (deliveryProfileId) {
      sendManagement.deliveryProfileId = deliveryProfileId
    }

    // send the email
    let url = `${this.parent.restEndpoint}/guide/v1/emails/preview/send`
    let response = await axios.post(url, {
      "emailID": emailId,
      "subjectPrefix": subjectPrefix ? subjectPrefix : `[Test] `,
      "trackLinks": true,
      "suppressTracking": true,
      "options": {
        "EnableETURLs": "true"
      },
      "recipients": Array.isArray(recipients) ? recipients : [recipients],
      "isMultipart": true,
      "dataSource": {
        "type": "DataExtension",
        "id": deId,
        "row": rowId
      },
      "sendManagement": Object.assign({}, this.sendManagement, {senderProfileId, deliveryProfileId})
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  /**
   * Generate the email preview html (without the preview contact)
   * 
   * @param {int} emailId 
   * @returns string HTML body
   */
  async generatePreviewHtml(emailId) {
    let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/preview` // GetEmailPreviewByID

    let response = await axios.post(url, {}, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return this._extractHtmlBodyFromPreviewResponseData(response.data)
  }

  _extractHtmlBodyFromPreviewResponseData (responseData) {
    let views = _.get(responseData, 'message.views', null)
    if (views) {
      let htmlBodyView = views.find(o => {
        return o.contentType === "vnd.exacttarget.message.email.htmlBody"
      })

      if (htmlBodyView) {
        return htmlBodyView.content
      }
    }

    return null
  }
}

module.exports = Email