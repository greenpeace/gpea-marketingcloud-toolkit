const axios = require('axios');
const xml2js = require('xml2js')
const _ = require('lodash')
const logger = require('../../lib/logger');

const Automation = require("./Automation")
const Journey = require("./Journey")
const JourneyBuilder = require("./JourneyBuilder/JourneyBuilder")
const Messaging = require("./Messaging")
const Send = require("./Send")
const Email = require("./Email")
const DataExtension = require("./DataExtension")
const SMS = require("./SMS")
const CloudPage = require("./CloudPage")
require('dotenv').config()

class MCBase {
  constructor(options) {
    this.clientId = options.clientId
    this.clientSecret = options.clientSecret
    this.subDomain = options.subDomain
    this.accountId = options.accountId

    if (options.market) {
      this.market = this.setMarket(options.market)
      this._loadMarketVariable()
    }

    if ( !this.clientId || !this.clientSecret || !this.subDomain || !this.accountId) {
      throw new Error('clientId, clientSecret, subDomain are accountId required.')
    }

    this.soapEndpoint = `https://${this.subDomain}.soap.marketingcloudapis.com/Service.asmx`
    this.wsdlEndpoint = `https://${this.subDomain}.soap.marketingcloudapis.com/etframework.wsdl`
    this.restEndpoint = `https://${this.subDomain}.rest.marketingcloudapis.com`

    this.accessToken = null
    this.soapClient = null
  }

  setMarket (market) {
    market = market.toLowerCase()

    if (["gpea","tw","hk","kr"].indexOf(market)<0) {
      throw new Error("The market should be one of gpea, tw, hk or kr")
    }

    this.market = market
    return this.market
  }

  _loadMarketVariable ()  {
    if ( !this.market) {
      throw new Error("Load Market variable without market defined.")
    }

    if (this.market==="gpea") {
      this.clientId = process.env.MC_GPEA_CLIENTID
      this.clientSecret = process.env.MC_GPEA_CLIENTSECRET
      this.subDomain = process.env.MC_GPEA_SUBDOMAIN
      this.accountId = process.env.MC_GPEA_ACCOUNTID
    } else if (this.market==="tw") {
      this.clientId = process.env.MC_TW_CLIENTID
      this.clientSecret = process.env.MC_TW_CLIENTSECRET
      this.subDomain = process.env.MC_TW_SUBDOMAIN
      this.accountId = process.env.MC_TW_ACCOUNTID
    } else if (this.market==="hk") {
      this.clientId = process.env.MC_HK_CLIENTID
      this.clientSecret = process.env.MC_HK_CLIENTSECRET
      this.subDomain = process.env.MC_HK_SUBDOMAIN
      this.accountId = process.env.MC_HK_ACCOUNTID
    } else if (this.market==="kr") {
      this.clientId = process.env.MC_KR_CLIENTID
      this.clientSecret = process.env.MC_KR_CLIENTSECRET
      this.subDomain = process.env.MC_KR_SUBDOMAIN
      this.accountId = process.env.MC_KR_ACCOUNTID
    } else {
      throw new Error("un-supported market: "+this.market)
    }
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
    } else if (instanceName==="Messaging") {
      obj = new Messaging()
    } else if (instanceName==="Send") {
      obj = new Send()
    } else if (instanceName==="JourneyBuilder") {
      obj = new JourneyBuilder()
    } else if (instanceName==="Email") {
      obj = new Email()
    } else if (instanceName==="DataExtension") {
      obj = new DataExtension()
    } else if (instanceName==="SMS") {
      obj = new SMS()
    } else if (instanceName==="CloudPage") {
      obj = new CloudPage()
    } else {
      logger.warn(`Cannot find the instanceName ${instanceName}`)
    }

    if (obj) {
      obj.parent = this
    }

    if (typeof obj.init ==="function") {
      obj.init()
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
    let updateResponse = _.get(jsonResponse, "soap:Envelope.soap:Body.UpdateResponse")
    let deleteResponse = _.get(jsonResponse, "soap:Envelope.soap:Body.DeleteResponse")

    if (retrieveResponseMsg) {
      if (['OK', 'MoreDataAvailable'].indexOf(retrieveResponseMsg.OverallStatus)<0) {
        throw new Error(retrieveResponseMsg.OverallStatus)
      }

      return _.get(retrieveResponseMsg, "Results", [])
    }

    if (createResponse) {
      if (createResponse.Results.StatusCode!=="OK") {
        throw new Error(createResponse.Results.StatusMessage)
      }

      return _.get(createResponse, "Results.Object", [])
    }

    if (updateResponse) {
      if (['OK', 'MoreDataAvailable'].indexOf(updateResponse.OverallStatus)<0) {
        let errMsg = _.get(updateResponse, 'Results.StatusMessage')
        if (errMsg) {
          logger.error(updateResponse.OverallStatus+": "+errMsg)
        }

        throw new Error(updateResponse.OverallStatus)
      }

      return updateResponse.Results
    }

    if (deleteResponse) {
      if (deleteResponse.Results.StatusCode!=="OK") {
        throw new Error(deleteResponse.Results.StatusMessage)
      }

      return _.get(deleteResponse, "Results.Object", [])
    }

    throw new Error("Unhandle sopa response")
  }
}

module.exports = MCBase
