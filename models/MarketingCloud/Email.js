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
  async generatePreviewHtmlByDeContactId(emailId, deId, contactId) {

    // let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/dataExtension/${deId}/row/${rowIdx}/preview`
    // let url = `${this.parent.restEndpoint}/guide/v1/emails/preview/send`
    // let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/dataExtension/${deId}/row/${rowIdx}/preview` // GetEmailPreviewByID
    // let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/dataExtension/${deId}/contacts/0032u00000ENwJlAAL/preview` // GetEmailPreviewByID
    // let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/dataExtension/38c76ffa-b40f-ec11-b85c-b883035b8991/row/5000/preview` // GetEmailPreviewByID
    // let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/dataExtension/38c76ffa-b40f-ec11-b85c-b883035b8991/contacts/4950192/preview` // OK GetEmailPreviewByID
    let url = `${this.parent.restEndpoint}/guide/v1/emails/${emailId}/dataExtension/${deId}/contacts/${contactId}/preview` // OK GetEmailPreviewByID

    let response = await axios.post(url, {

    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return this._extractHtmlBodyFromPreviewResponseData(response.data)
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