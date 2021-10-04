const MCBase = require('../MarketingCloud/Base')
const AutomationCheck = require("./AutomationChecks")
const JourneyCheck = require("./JourneyChecks")
const logger = require('../../lib/logger');
const Notifier = require('../../lib/Notifier.js')
const format = require('date-fns/format')
const axios = require('axios');
require('dotenv').config()

async function main() {
  let markets = ["TW", "HK"]

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    logger.debug(`Start to check market ${market}`)

    let mcbase
    let journeyRules = []

    if (market === "TW") {
      // init marketing cloud settings
      mcbase = new MCBase({
        clientId: process.env.MC_TW_CLIENTID,
        clientSecret: process.env.MC_TW_CLIENTSECRET,
        subDomain: process.env.MC_TW_SUBDOMAIN,
        accountId: process.env.MC_TW_ACCOUNTID,
      })
    } else if (market === "HK") {
      // init marketing cloud settings
      mcbase = new MCBase({
        clientId: process.env.MC_HK_CLIENTID,
        clientSecret: process.env.MC_HK_CLIENTSECRET,
        subDomain: process.env.MC_HK_SUBDOMAIN,
        accountId: process.env.MC_HK_ACCOUNTID,
      })
    }

    if (!mcbase) {
      throw new Error(`Undefined market ${market}`)
    }

    // fetch journey rules
    let url = `${process.env.JOURNEY_SCHEMA_ENPOINT}?q={"status":"Enable", "market":"${market}"}`
    logger.debug(`Retrieving the journey settings for ${market}: ${url}`)
    let response = await axios.get(url)
    journeyRules = response.data.records ? response.data.records : [];
    logger.debug(`Use journey ruels ${JSON.stringify(journeyRules, null, 2)}`)

    // auth with marketing cloud
    await mcbase.doAuth()

    let allErros = []
    let rs;

    rs = await AutomationCheck(mcbase)
    allErros = allErros.concat(rs.errors)

    rs = await JourneyCheck(mcbase, journeyRules)
    allErros = allErros.concat(rs.errors)
    // console.log('journey errors', errors)


    if (allErros.length) {
      allErros.unshift({ message: `\n　\n🙈🙈🙈 ${market}: *${allErros.length}* errors on *${format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx")}*\n` })
      Notifier.sendToSlack(allErros.map(e => e.message).join("\n"))
    } else {
      Notifier.sendToSlack(`👍👍👍 ${market}: No Errors today`)
    }
  }
}


// (async () => {
//   var text = await main();
// })()

module.exports = main