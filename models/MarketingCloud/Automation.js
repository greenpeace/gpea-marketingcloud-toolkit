const axios = require('axios');
const _ = require("lodash")
const logger = require('../../lib/logger');


/**
 * Status Map @see https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-apis.meta/mc-apis/automation.htm
 * 
 * Code 	Status Type 	Message
-1 	Error 	Program errored out
0 	BuildingError 	Program errored out during building
1 	Building 	Program building with activities, schedules, and other elements
2 	Ready 	Program ready to start
3 	Running 	Program running
4 	Paused 	Program paused from running state
5 	Stopped 	Program stopped
6 	Scheduled 	Program scheduled
7 	Awaiting Trigger 	Program waiting for a trigger
8 	InactiveTrigger 	Program trigger inactive
 */
class Automation {
  async findBy(criteria) {
    let rbody = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope
        xmlns:s = "http://www.w3.org/2003/05/soap-envelope"
        xmlns:a = "http://schemas.xmlsoap.org/ws/2004/08/addressing"
        xmlns:u = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" >
        <s:Header>
          <a:Action s:mustUnderstand="1">Retrieve</a:Action>
          <a:To s:mustUnderstand="1">https://${this.parent.subDomain}.soap.marketingcloudapis.com/Service.asmx</a:To>
          <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
        </s:Header>
        <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <RetrieveRequest>
              <ObjectType>Automation</ObjectType>

              <Properties>ObjectID</Properties>
              <Properties>Name</Properties>
              <Properties>CustomerKey</Properties>
              <Properties>Status</Properties>
              <Properties>ScheduledTime</Properties>
              <Properties>CreatedDate</Properties>
              <Properties>ObjectState</Properties>
              <Properties>Owner</Properties>
              <Properties>Schedule</Properties>
              <Properties>CreatedDate</Properties>
              <Properties>ModifiedDate</Properties>
              <Properties>Description</Properties>

              <Filter xsi:type="SimpleFilterPart">
                <Property>${criteria["field"]}</Property>
                <SimpleOperator>equals</SimpleOperator>
                <Value>${criteria["value"]}</Value>
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

    return await this.parent.handleSoapResponse(response)
  }

  /**
   * To delete an automation
   * 
   * @param {string} customerKey The customer Key of the automation
   * @returns Throw exception if not found or something wrong
   */
  async delete(customerKey) {
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
        <DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
          <Options></Options>
          <Objects xsi:type="Automation">
            <PartnerKey xsi:nil="true"></PartnerKey>
            <ObjectID xsi:nil="true"></ObjectID>
            <CustomerKey>${customerKey}</CustomerKey>
          </Objects>
        </DeleteRequest>
      </s:Body>
    </s:Envelope>
    `
    // console.log('rbody', rbody)
    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: { 'Content-Type': 'application/soap+xml' }
    })

    return await this.parent.handleSoapResponse(response)
  }
}

module.exports = Automation