const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')
const format = require('date-fns/format')
const fs = require('fs')

/**
 * Send all the email previews of a journey
 */
async function main() {
  // EDIT HERE!
  // 'hk-debit_fail-automd-hard_fail',
  // 'hk-debit_fail-automd-soft_fail',
  // 'hk-debit_fail-automd-weekly_reminder'
  let targetJourneyName = 'kr-annual_upgrade-adhoc-20231205-honeybee-1click_url_generation'
  let emailPrefix = `[honeybee]`
  // let recipients = ['uchen@greenpeace.org', 'gigi.wu@greenpeace.org']
  // let recipients = ['uchen@greenpeace.org', 'mirang.kim@greenpeace.org', ]
  // let recipients = ['uchen@greenpeace.org', 'gigi.wu@greenpeace.org']
  let recipients = ['store_this_email@mg.colalin.cc']
  let market = "kr"

  let deFilter
  // let deFilter = {property:"Recurring Donation Status", simpleOperator:"notEquals", value:"Active"}

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
  r = await mcDE.fetchDeRows(deName, {filter: deFilter})
  logger.info(`Found ${r.length} rows`)

  // random show some candidate rows
  let sampleSize = 3
  let sampleRows = _.sampleSize(r, sampleSize)

  // // manually assign the ContactId to preview
  // let targetContactId = '0032u00000DpihGAAR'
  // let foundContactRow = r.find(row => row.some(pair => pair.Name==="Id" && pair.Value===targetContactId))
  // if (foundContactRow) {
  //   sampleRows = [foundContactRow]
  // } else {
  //   throw new Error(`Cannot find row with ContactId ${targetContactId}`)
  // }

  // resolve using which row to preview
  logger.info(`Sample ${sampleSize.length} rows:`)
  logger.info(sampleRows)
  let previewRow = _.sample(sampleRows)  // [{ Name: '_CustomObjectKey', Value: '39681' }, ...]

  // convert into {Name:Value, ...}
  previewRow = previewRow.reduce((accumlator, currentRow) => {
    accumlator[currentRow.Name] = currentRow.Value
    return accumlator
  }, {})

  let previewRowId = previewRow['_CustomObjectKey']

  // let previewRowId = 100

  logger.info(`Using rowId: ${previewRowId} to preview email`)
  // logger.info(JSON.stringify(previewRow, null, 4))

  // find the email activities of the journey
  r = await mcJourney.findByName(targetJourneyName, {mostRecentVersionOnly: true})
  fs.writeFileSync(targetJourneyName, JSON.stringify(r, null, 2))

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
    // // logger.debug(r)
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

  // prepare the LMS(KR SMS) content previews
  let lmsActivities = activities.filter(a => a.type==="REST" && ['LMS', 'SUREMKAKAO'].indexOf(_.get(a, "arguments.execute.inArguments.0.sendtype"))>=0)
  logger.info(`Start to render LMS previews`)
  // console.log('lmsActivities', lmsActivities)
  for (let i = 0; i < lmsActivities.length; i++) {
    const aLmsAct = lmsActivities[i];

    let lmsName = _.get(aLmsAct, 'name')
    let lmsTitle = _.get(aLmsAct, 'arguments.execute.inArguments.0.title')
    let lmsContent = _.get(aLmsAct, 'arguments.execute.inArguments.0.msg')
    let paramData = _.get(aLmsAct, 'arguments.execute.inArguments.0.paramData')

    // console.log('lmsTitle', lmsTitle)
    // console.log('lmsContent', lmsContent)

    // TODO
    // 1. Query the DE by _customObjectKey instead of giving a object
    // 2. Correctly render the content
    let {renderedContent, contentFieldsNotFound} = await mcSMS.renderLMS({
      content: lmsContent,
      paramData: paramData,
      contactRow: previewRow
    })

    logger.info(`  [${lmsName}] \n${lmsTitle}\n${renderedContent}`)
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
