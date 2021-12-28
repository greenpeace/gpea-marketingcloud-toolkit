const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')
const subDays = require('date-fns/subDays')

class Send {

  /**
   * Retrieve the all the sends which in given days
   * 
   * @param {int} days 
   * @return {array}
   */
  async getSends(inDays=3) {
    let findAfterDate = subDays(new Date(), inDays);
    

    let rbody = `<?xml version="1.0" encoding="UTF-8"?>
    <s:Envelope
      xmlns:s = "http://www.w3.org/2003/05/soap-envelope"
      xmlns:a = "http://schemas.xmlsoap.org/ws/2004/08/addressing"
      xmlns:u = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" >
      <s:Header>
        <a:Action s:mustUnderstand="1">Delete</a:Action>
        <a:To s:mustUnderstand="1">https://${this.parent.subDomain}.soap.marketingcloudapis.com/Service.asmx</a:To>
        <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
      </s:Header>
      <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
          <RetrieveRequest>
            <ObjectType>Send</ObjectType>
            <Properties>ID</Properties>
            <Properties>Client.ID</Properties>
            <Properties>Email.ID</Properties>
            <Properties>SendDate</Properties>
            <Properties>FromName</Properties>
            <Properties>Duplicates</Properties>
            <Properties>InvalidAddresses</Properties>
            <Properties>ExistingUndeliverables</Properties>
            <Properties>ExistingUnsubscribes</Properties>
            <Properties>HardBounces</Properties>
            <Properties>SoftBounces</Properties>
            <Properties>OtherBounces</Properties>
            <Properties>UniqueClicks</Properties>
            <Properties>UniqueOpens</Properties>
            <Properties>NumberSent</Properties>
            <Properties>Unsubscribes</Properties>
            <Properties>MissingAddresses</Properties>
            <Properties>Subject</Properties>
            <Properties>SentDate</Properties>
            <Properties>EmailName</Properties>
            <Properties>FromAddress</Properties>
            <Properties>FromName</Properties>
            <Properties>Status</Properties>

            <Filter xsi:type="SimpleFilterPart">
              <Property>SendDate</Property>
              <SimpleOperator>greaterThan</SimpleOperator>
              <DateValue>${format(findAfterDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}</DateValue>
            </Filter>
          </RetrieveRequest>
        </RetrieveRequestMsg>
      </s:Body>
    </s:Envelope>
    `
    // console.log('rbody', rbody)
    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: { 'Content-Type': 'application/soap+xml' }
    })

    response = await this.parent.handleSoapResponse(response)

    if (_.isPlainObject(response)) {
      response = [response]
    }

    return response
  }
}

module.exports = Send