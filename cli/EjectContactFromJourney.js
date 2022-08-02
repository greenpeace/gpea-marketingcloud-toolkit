const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main () {
  let mcbase = new MCBase({
    clientId: process.env.MC_HK_CLIENTID,
    clientSecret: process.env.MC_HK_CLIENTSECRET,
    subDomain: process.env.MC_HK_SUBDOMAIN,
    accountId: process.env.MC_HK_ACCOUNTID,
  })
  await mcbase.doAuth()

  let mcJourney = mcbase.factory('Journey')
  let mcAutomation = mcbase.factory('Automation')

  // assign the journey names
  let jName = "hk-oneoff_conversion-automd-2021_special_sg2rg-20211020"
  
  // To eject these contact from the journey
  let contactKeys = ['0032u00000VshiyAAB', '0032u00000VtGHAAA3', '0032u00000VtIHGAA3']

  let j = await mcJourney.findByName(jName)
  let jKey = _.get(j, 'items.0.key')

  for (let i = 0; i < contactKeys.length; i++) {
    const contactKey = contactKeys[i];
    logger.info(`Ejecting contactId ${contactKey} from journey ${jName}`)
    let r = await mcJourney.ejectContact(jKey, contactKey)
    console.log(r)
  }

  let stat = await mcJourney.getJourneyStatByName(jName)
  delete stat.journey
  console.log('stat', stat)
}


(async () => {
  var text = await main();
})().catch(e => {
  logger.error(e.stack)

  if (e.isAxiosError) {
    console.error(e)

    if (e.response.data) {
      logger.error(JSON.stringify(e.response.data,null,2))
    }
  }
});
