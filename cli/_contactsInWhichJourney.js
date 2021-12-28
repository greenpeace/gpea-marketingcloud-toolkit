const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main () {
  let mcbase = new MCBase({
    clientId: process.env.MC_TW_CLIENTID,
    clientSecret: process.env.MC_TW_CLIENTSECRET,
    subDomain: process.env.MC_TW_SUBDOMAIN,
    accountId: process.env.MC_TW_ACCOUNTID,
  })
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')

  // contacts keys to find
  let contactKeys = ["0032u00000DpLe0AAF", "0032u00000Dpj8CAAR", "0032u00000DpleYAAR"]

  let r = await mcJourney.contactInWhichJourneys(contactKeys)
  console.log('r', JSON.stringify(r,null,2))

  let foundContactMemberships = _.get(r, 'results.contactMemberships', [])    
  for (let i = 0; i < foundContactMemberships.length; i++) {
    let contactKey = foundContactMemberships[i].contactKey;
    let definitionKey = foundContactMemberships[i].definitionKey;

    let j = await mcJourney.findByKey(definitionKey)

    console.log("contactKey", contactKey)
    console.log(` is in ${j['name']} v${j['version']}`)

    
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
