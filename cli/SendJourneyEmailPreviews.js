const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')
const format = require('date-fns/format')

/**
 * Send all the email previews of a journey
 */
async function main() {
  // EDIT HERE!
  let targetJourneyName = 'hk-lead_conversion-automd-plastic-dpt-policy'
  let emailPrefix = ``
  let recipients = ['uchen@greenpeace.org']
  let market = "hk"

  // main
  let mcbase = new MCBase({market})

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')
  let mcEmail = mcbase.factory('Email')
  let mcDE = mcbase.factory('DataExtension')
  let mcSMS = mcbase.factory('SMS')
  let r;

  // find the trigger DE Name
  logger.info(`Resolving [${targetJourneyName}] definitions …`)
  let eventDef = await mcJourney.getJourneyEventDefinitionsByJourneyName(targetJourneyName)
  let deName = _.get(eventDef, 'dataExtensionName', null)
  
  // resolve the original de
  let de = await mcDE.findDeBy({field: "Name", value:deName})
  let deId = de.ObjectID
  let deCustomerKey = de.CustomerKey
  
  // fetch rows
  logger.info(`Fetching DE rows [${deName}], deId: ${deId} …`)
  r = await mcDE.fetchDeRows(deName)
  logger.info(`Found ${r.length} rows`)

  // resolve using which row to preview
  let previewRowIdx = r.length-1
  let previewRow = r[previewRowIdx] // [{ Name: '_CustomObjectKey', Value: '39681' }, ...]

  // convert into {Name:Value, ...}
  previewRow = previewRow.reduce((accumlator, currentRow) => {
    accumlator[currentRow.Name] = currentRow.Value
    return accumlator
  }, {})

  let previewRowId = previewRow['_CustomObjectKey']

  logger.info(`Using rowIdx #${previewRowIdx} (rowId: ${previewRowId}) to preview email`)
  logger.info(JSON.stringify(previewRow, null, 4))

  // find the email activities of the journey
  r = await mcJourney.findByName(targetJourneyName, {mostRecentVersionOnly: true})

  let activities = _.get(r, 'items.0.activities')
  let emailActivities = activities.filter(a => a.type==="EMAILV2")

  // send the preview emails
  logger.info(`Start to send test emails to ${JSON.stringify(recipients)}`)
  for (let i = 0; i < emailActivities.length; i++) {
    let activityName = emailActivities[i].name
    let emailId = emailActivities[i].configurationArguments.triggeredSend.emailId
    let emailSubject = emailActivities[i].configurationArguments.triggeredSend.emailSubject
    let sendClassificationId = emailActivities[i].configurationArguments.triggeredSend.sendClassificationId
    let senderProfileId = emailActivities[i].configurationArguments.triggeredSend.senderProfileId
    let deliveryProfileId = emailActivities[i].configurationArguments.triggeredSend.deliveryProfileId

    // resolve the prefix
    let prefix = emailPrefix
    prefix += '['+activityName.replace(emailSubject, '').replace(/[\s-_]+$/, '')+'] '

    // resolve the email name
    let emailObj = await mcEmail.findEmailByLegacyEmailId(emailId)
    let emailName = _.get(emailObj, '0.name')

    // send the email
    let logMsg = `${prefix}${emailSubject}`
    if (logMsg.indexOf(emailName)<0) {
      logMsg = `${emailName}: ${logMsg}`
    } 

    logger.info("  "+logMsg)
    let r = await mcEmail.postEmailPreviewSend({
      emailId: emailId, 
      deId: deId, 
      rowId: previewRowId, 
      recipients: recipients,
      subjectPrefix: prefix,
      
      senderProfileId,
      deliveryProfileId
    })
  }

  // prepare the SMS content previews
  let smsActivities = activities.filter(a => a.type==="SMSSYNC")
  logger.info(`Start to render SMS previews`)
  for (let i = 0; i < smsActivities.length; i++) {
    const aSmsAct = smsActivities[i];
    
    let smsAssetId = _.get(aSmsAct, 'configurationArguments.assetId')
    let smsName = _.get(aSmsAct, 'name')
    let smsContent = _.get(aSmsAct, 'metaData.store.selectedContentBuilderMessage')

    let {renderedContent, contentFieldsNotFound} = await mcSMS.render({
      content: smsContent,
      deCustomerKey: deCustomerKey,
      deRowId: previewRowId
    })

    logger.info(`  [${smsName}] ${renderedContent}`)
  }

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
