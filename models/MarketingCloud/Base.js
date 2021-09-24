const axios = require('axios');
const xml2js = require('xml2js')
const _ = require('lodash')
const logger = require('../../lib/logger');

const Automation = require("./Automation")
const Journey = require("./Journey")

class MCBase {
  constructor(options) {
    this.clientId = options.clientId
    this.clientSecret = options.clientSecret
    this.subDomain = options.subDomain
    this.accountId = options.accountId

    if ( !this.clientId || !this.clientSecret || !this.subDomain || !this.accountId) {
      throw new Error('clientId, clientSecret, subDomain are accountId required.')
    }

    this.soapEndpoint = `https://${this.subDomain}.soap.marketingcloudapis.com/Service.asmx`
    this.wsdlEndpoint = `https://${this.subDomain}.soap.marketingcloudapis.com/etframework.wsdl`
    this.restEndpoint = `https://${this.subDomain}.rest.marketingcloudapis.com`

    this.accessToken = null
    this.soapClient = null
  }

  async doAuth() {
    let response = await axios.post(`https://${this.subDomain}.auth.marketingcloudapis.com/v2/token`, {
      "grant_type": "client_credentials",
      "client_id": this.clientId,
      "client_secret": this.clientSecret,
      "account_id": this.accountId
    })

    let accessToken = this.accessToken = response.data.access_token.trim()
    logger.debug(`Auth with marketing cloud successfully with clientId: ${this.clientId}`)

    if ( !accessToken) {
      throw new Error("Cannot auth with Marketing Cloud. Please check .env file.")
    }
  }

  factory (instanceName) {
    let obj = null
    if (instanceName==="Automation") {
      obj = new Automation()
    } else if (instanceName==="Journey") {
      obj = new Journey()
    } else {
      logger.warn(`Cannot find the instanceName ${instanceName}`)
    }

    if (obj) {
      obj.parent = this
    }

    return obj
  }

  async handleSoapResponse (soapResponse) {
    let jsonResponse = await xml2js.parseStringPromise(soapResponse.data, { 
      explicitArray: false,
      ignoreAttrs: true
    })

    let retrieveResponseMsg = _.get(jsonResponse, "soap:Envelope.soap:Body.RetrieveResponseMsg")
    let createResponse = _.get(jsonResponse, "soap:Envelope.soap:Body.CreateResponse")
    let performResponseMsg = _.get(jsonResponse, "soap:Envelope.soap:Body.PerformResponseMsg")
    let deleteResponse = _.get(jsonResponse, "soap:Envelope.soap:Body.DeleteResponse")

    if (retrieveResponseMsg) {
      if (retrieveResponseMsg.OverallStatus!=="OK") {
        throw new Error(retrieveResponseMsg.OverallStatus)
      }
      
      return _.get(retrieveResponseMsg, "Results", [])
    }

    throw new Error("Unhandle sopa response")
  }
}

module.exports = MCBase
