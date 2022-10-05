const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')
const format = require('date-fns/format')

/**
 * List the Data Extension fields
 */
async function main() {
  // EDIT HERE!
  let deName = 'tw-utils-automd-opens_clicks_statistic'
  let market = "tw"
  // main
  let mcbase = new MCBase({market})

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')
  let mcEmail = mcbase.factory('Email')
  let mcDE = mcbase.factory('DataExtension')
  let mcSMS = mcbase.factory('SMS')
  let r;
  
  // resolve the original de
  let de = await mcDE.findDeBy({field: "Name", value:deName})
  let deId = de.ObjectID
  let deCustomerKey = de.CustomerKey
  

  console.log('DE ID (ObjectId)', deId)
  console.log('DE CustomerKey', deCustomerKey)

  let deFields = await mcDE.getDataExtensionFields({"field":"DataExtension.CustomerKey", "value":deCustomerKey})
  properties = deFields.map(o => o.Name)

  console.log("DE Fields", properties)
}


(async () => {
  var text = await main();
})().catch(e => {
  logger.error(e.stack)

  if (e.isAxiosError) {
    console.error(e)

    if (e.response.data) {
      logger.error(JSON.stringify(e.response.data, null, 2))
    }
  }
});
