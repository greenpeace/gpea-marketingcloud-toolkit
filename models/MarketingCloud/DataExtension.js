const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')
const xml2js = require('xml2js')

class DataExtension {
  /**
   * 
   * @param {*} criteria {"field":"Name", "value":deName}
   */
  async findDeBy (criteria) {
    let rbody = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope 
        xmlns:s="http://www.w3.org/2003/05/soap-envelope" 
        xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" 
        xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <s:Header>
          <a:Action s:mustUnderstand="1">Retrieve</a:Action>
          <a:To s:mustUnderstand="1">${this.parent.soapEndpoint}</a:To>
          <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
        </s:Header>
        <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <RetrieveRequest>
              <ObjectType>DataExtension</ObjectType>
              <Properties>ObjectID</Properties>
              <Properties>CustomerKey</Properties>
              <Properties>Name</Properties>
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

    let response = await axios.post( this.parent.soapEndpoint, rbody, {
      headers: {'Content-Type': 'application/soap+xml'}
    })

    return await this.parent.handleSoapResponse(response)
  }

  async fetchDeRows (deName) {
    let rbody = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope 
        xmlns:s="http://www.w3.org/2003/05/soap-envelope" 
        xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" 
        xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <s:Header>
          <a:Action s:mustUnderstand="1">Retrieve</a:Action>
          <a:To s:mustUnderstand="1">${this.parent.soapEndpoint}</a:To>
          <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
        </s:Header>
        <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <RetrieveRequest>
              <ObjectType>DataExtensionObject[${deName}]</ObjectType>
              <Properties>_CustomObjectKey</Properties>
              <Properties>Id</Properties>
              <Properties>Email</Properties>
              <Properties>FirstName</Properties>
              <Properties>LastName</Properties>
            </RetrieveRequest>
          </RetrieveRequestMsg>
        </s:Body>
      </s:Envelope>
    `

    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: {'Content-Type': 'application/soap+xml'}
    })

    return await this.parent.handleSoapResponse(response)
  }
}

module.exports = DataExtension