const MCBase = require("../MarketingCloud/Base");
const AutomationCheck = require("./AutomationChecks");
const JourneyNumAudiencesChecks = require("./JourneyNumAudiencesChecks");
const JourneyStageErrorChecks = require("./JourneyStageErrorChecks");
const SingleSendEmailChecks = require("./SingleSendEmailChecks");
const logger = require("../../lib/logger");
const Notifier = require("../../lib/Notifier.js");
const format = require("date-fns/format");
const axios = require("axios");
require("dotenv").config();

async function main() {
  let markets = ["TW", "HK", "KR"];

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    logger.debug(`Start to check market ${market}`);

    let mcbase;
    let journeyRules = [];

    mcbase = new MCBase({market});
    if (!mcbase) {
      throw new Error(`Undefined market ${market}`);
    }

    // fetch journey rules
    let url = `${process.env.JOURNEY_SCHEMA_ENPOINT}?q={"status":"Enable", "market":"${market}"}`;
    logger.debug(`Retrieving the journey settings for ${market}: ${url}`);
    let response = await axios.get(url);
    journeyRules = response.data.records ? response.data.records : [];
    // logger.debug(`Use journey ruels ${JSON.stringify(journeyRules, null, 2)}`)

    // auth with marketing cloud
    await mcbase.doAuth();

    let allErros = [];
    let rs;

    rs = await AutomationCheck(mcbase);
    allErros = allErros.concat(rs.errors);

    rs = await JourneyNumAudiencesChecks(mcbase, journeyRules);
    allErros = allErros.concat(rs.errors);
    // console.log('journey errors', errors)

    rs = await SingleSendEmailChecks(mcbase);
    allErros = allErros.concat(rs.errors);
    // console.log('send errors', rs.errors)

    if (allErros.length) {
      allErros.unshift({ message: `\n　\n🙈🙈🙈 ${market}: *${allErros.length}* errors on *${format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx")}*\n` });
      Notifier.sendToSlack(allErros.map((e) => e.message).join("\n"));
    } else {
      Notifier.sendToSlack(`👍👍👍 ${market}: No Errors today`);
    }

    let allWarnings = [];
    rs = await JourneyStageErrorChecks(mcbase);
    allWarnings = allWarnings.concat(rs.errors);
    // console.log('journey stage errors', rs.errors)
    // console.log(JSON.stringify(rs.errors, null, 4));

    if (allWarnings.length) {
      allWarnings.unshift({ message: `\n　\n 🙋🙋🙋 ${market}: *${allWarnings.length}* warnings on *${format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx")}*\n` });
      Notifier.sendToSlack(allWarnings.map((e) => e.message).join("\n"));
    }
  }
}

// (async () => {
//   var text = await main();
// })()

module.exports = main;
