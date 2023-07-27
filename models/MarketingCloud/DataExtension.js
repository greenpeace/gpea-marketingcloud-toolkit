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

  /**
   * Return the top 2500 rows from data extension
   *
   * @param {string} deName
   * @param {Object} option
   *  option.properties {Array} What fields to return
   *  option.filter {Object} Filter the results. {property:string, simpleOperator:string, value:string}
   *    @see https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/simplefilterpart.html
   * @returns
   */
  async fetchDeRows (deName, {properties, filter}={}) {
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

    // generate the filter XML
    let filterXML = ""
    if (filter) {
      filterXML = `<Filter xsi:type="SimpleFilterPart">
        <Property>${filter["property"]}</Property>
        <SimpleOperator>${filter["simpleOperator"] || "equals"}</SimpleOperator>
        <Value>${filter["value"]}</Value>
      </Filter>`
    }

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
              ${filterXML}
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
   * @param {string} deName
   * @param {array} rows [{key:value, ...}, ...]
   */
  async updateRow (deName, row) {
    // resolve the DE CustomerKey
    let r = await this.findDeBy({field: "Name", value:deName})
    let deId = r.ObjectID
    let deCustomerKey = r.CustomerKey

    // generate the XML
    let propertiesXML = ""
    let fieldXML = Object.keys(row).map(k => `<Property><Name>${k}</Name><Value><![CDATA[${row[k]}]]></Value></Property>`).join("")
    propertiesXML += `<Properties>${fieldXML}</Properties>\n`

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
        <UpdateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
          <Options />
          <Objects xsi:type="ns1:DataExtensionObject" xmlns:ns1="http://exacttarget.com/wsdl/partnerAPI">
              <CustomerKey>${deCustomerKey}</CustomerKey>
              ${propertiesXML}
          </Objects>
        </UpdateRequest>
        </s:Body>
      </s:Envelope>
    `
    // console.log('rbody', rbody)
    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: {'Content-Type': 'application/soap+xml'}
    })

    r = await this.parent.handleSoapResponse(response)
    return r
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

  /**
  To Create a Data extension in the marketing cloud.
  Note, if you create with a existing name, you'll have an error.

  @params deName: The target extension name
  @params contactIdFieldName: string The contactId field name. The MC uses this field to lookup contacts.
  @params fields: [{
    Name:string,
    FieldType:Boolean|Date|Decimal|EmailAddress|Number|Phone|Text @see https://sforce.co/3ys4XH4
    IsRequired: bool,
    IsPrimaryKey: bool,
    MaxLength:int # Only for text field
    DefaultValue: mixed
  }]

  :return: bool True when create successfully
  */
  async createDataExtension ({deName, fields, contactIdFieldName="Id", isSendable=true}) {
    if ( !deName) {
      throw new Error("deName is required.")
    }

    // prepare the xml for the fields
    let fieldXml = ""
    fields.forEach(fieldObj => {
      fieldXml += "<Field>\n"

      // path the fields
      if (fieldObj["FieldType"]=="Text") {
        fieldObj.MaxLength = fieldObj.MaxLength || 255
      }

      if (fieldObj["FieldType"]=="Decimal") {
        fieldObj.MaxLength = fieldObj.MaxLength || 18
        fieldObj.Scale = fieldObj.Scale || 5
      }

      if (fieldObj.MaxLength && ["Text", "Decimal"].indexOf(fieldObj.FieldType)<0) {
        delete fieldObj.MaxLength // since it cause the creation error
      }

      // generate the detailed XMLs
      Object.keys(fieldObj).forEach(k => {
        let v = fieldObj[k]

        if (_.isBoolean(v)) {
          fieldXml += `<${k}>${v ? 1:0}</${k}>`
        } else {
          fieldXml += `<${k}>${_.escape(v)}</${k}>`
        }
      })

      fieldXml += "</Field>\n"
    })

    // generate the XML
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
          <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <Objects xsi:type="DataExtension">
                <Name>${deName}</Name>
                <IsSendable>${isSendable ? "true":"false"}</IsSendable>
                <IsTestable>${isSendable ? "true":"false"}</IsTestable>
                <SendableDataExtensionField>
                    <Name>${contactIdFieldName}</Name>
                    <FieldType>Text</FieldType>
                </SendableDataExtensionField>
                <SendableSubscriberField>
                    <Name>Subscriber Key</Name>
                </SendableSubscriberField>
                <Fields>
                    ${fieldXml}
                </Fields>
            </Objects>
        </CreateRequest>
        </s:Body>
      </s:Envelope>
    `

    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: {'Content-Type': 'application/soap+xml'}
    })

    let r = await this.parent.handleSoapResponse(response)
    return r
  }
}

module.exports = DataExtension