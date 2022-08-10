const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")

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
              <Properties>IsSendable</Properties>
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

  async fetchDeRows (deName, {properties}={}) {
    // resolve the DE CustomerKey
    let r = await this.findDeBy({field: "Name", value:deName})
    let deId = r.ObjectID
    let deCustomerKey = r.CustomerKey

    // resolve the target fields
    if (properties==='ALL' || properties===undefined) {
      let deFields = await this.getDataExtensionFields({"field":"DataExtension.CustomerKey", "value":deCustomerKey})
      properties = deFields.map(o => o.Name)
    }

    // generate fields XML
    properties = _.union(['_CustomObjectKey'], properties || [])
    let propertiesXML = properties.map(s => `<Properties>${s}</Properties>`).join('')

    // generate the POST XML
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
              ${propertiesXML}
            </RetrieveRequest>
          </RetrieveRequestMsg>
        </s:Body>
      </s:Envelope>
    `

    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: {'Content-Type': 'application/soap+xml'}
    })

    r = await this.parent.handleSoapResponse(response)
    return r.map(o => o.Properties.Property)
  }

  /**
   * 
   * 
   * @see DataExtensionField https://sforce.co/3JAMXR6
   * 
   * @param {object} criteria 
   * @returns 
   */
  async getDataExtensionFields (criteria) {
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
              <ObjectType>DataExtensionField</ObjectType>
              <Properties>Client.ID</Properties>
              <Properties>CreatedDate</Properties>
              <Properties>CustomerKey</Properties>
              <Properties>DataExtension.CustomerKey</Properties>
              <Properties>DefaultValue</Properties>
              <Properties>FieldType</Properties>
              <Properties>IsPrimaryKey</Properties>
              <Properties>IsRequired</Properties>
              <Properties>MaxLength</Properties>
              <Properties>ModifiedDate</Properties>
              <Properties>Name</Properties>
              <Properties>ObjectID</Properties>
              <Properties>Ordinal</Properties>
              <Properties>Scale</Properties>

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
}

module.exports = DataExtension