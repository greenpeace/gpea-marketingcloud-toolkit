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

  // contacts keys to find
  let contactKeys = [
    '0032u00000HqoouAAB'
  ]

  
  // 

  let foundContactMemberships = []

  for (let i = 0; i < contactKeys.length; i+=50) {
    const element = contactKeys[i];

    let r = await mcJourney.contactInWhichJourneys(contactKeys.slice(i, i+50))
    foundContactMemberships = foundContactMemberships.concat(_.get(r, 'results.contactMemberships', []))

    console.log('r', JSON.stringify(r,null,2))
  }


  for (let i = 0; i < foundContactMemberships.length; i++) {
    let contactKey = foundContactMemberships[i].contactKey;
    let definitionKey = foundContactMemberships[i].definitionKey;

    let j = await mcJourney.findByKey(definitionKey)

    console.log(`${contactKey} is in ${j['name']} v${j['version']}`)
  }
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
