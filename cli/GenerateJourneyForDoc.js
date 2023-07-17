const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { rruleToHumanReadable } = require('../models/Utils/tools.js')
const cliProgress = require('cli-progress');


require('dotenv').config()

/**
 * The doc should contains
 *
 * 1. Entry Criteria (if its in triggerd mode)
 * 2. Entry SQL and its's scheduled time (if its from automation)
 * 3. OK Call Case Details
 *       Subject, Category, Sub Category, case Originm Campaign
 * 4. OK Call Case generated time (min-max), maybe multiple
 * 5. Journey Emails and SMS previews
 *
 */

/**
 * To update the journey criteria based on the pre-defined criteria.
 * For all the supported criteria, @see models/MarketingCloud/JourneyBuilder/DecisionSplitCriteria.js
 */
async function main() {
  // EDIT HERE
  const csvFileName = 'journeyDoc.csv'


  // let journeyNames = [
  //   'hk-new_donor_upgrade-automd',
  //   'hk-reactivation-automd-lapsed_donor',
  //   'hk-unfreeze_inactive-automd-inactive_donor',
  //   'hk-welcome_new_donor-automd-for_rg_status_delay_population-20220311',
  // ]

  let csvKeys = [
    "journeyName",
    "triggerCriteria",
    "repeat",
    "Subject",
    "Case Origin",
    "Campaign",
    "Category",
    "Sub Category",
    "minMinutesToThisActivity",
    "maxMinutesToThisActivity",
    "minDaysToThisActivity",
    "maxDaysToThisActivity",
    "emails",
    "smses",
    "lmses",
    "use369"
  ]

  // let allJourneys = await mcJourney.getAll()

  let csvRows = []
  let csvWriter = createCsvWriter({
    path: csvFileName,
    header: csvKeys.map(k => { return { id: k, title: k } }),
    append: false
  });

  const markets = ['HK', 'TW', 'KR']
  // const markets = ['TW']

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i]
    let mcbase = new MCBase({ market })
    await mcbase.doAuth()

    let mcJourney = mcbase.factory('Journey')
    let mcJB = mcbase.factory('JourneyBuilder')
    let mcDE = mcbase.factory('DataExtension')
    let mcAutomation = mcbase.factory('Automation')

    logger.info(`Fetching journeys for ${market} `)
    let allJourneys = await mcJourney.getAll()
    let journeyNames = []
    for (let i = 0; i < allJourneys.length; i++) {
      if (i%50===0) {
        await mcbase.doAuth() // auth again
      }

      const j = allJourneys[i];

      if (j && j.status == 'Published') {
        journeyNames.push(j.name)
        logger.info(`Read journey ${j.name} version:${j.version} status:${j.status}`)
      } else if (j && j.status=="Draft" && j.version>1) {
        journeyNames.push(j.name)
        logger.info(`Read journey ${j.name} version:${j.version} status:${j.status}`)
      } else if (j && (/test/i).test(j.name)) {
        logger.debug(`Skip journey ${j.name} due to "test"`)
      } else if (j) {
        logger.debug(`Skip journey ${j.name} version:${j.version} status:${j.status}`)
      } else {
        logger.debug(`Skip journey ${j.name} since not found`)
      }
    }

    // journeyNames = [
    //   // 'kr-oneoff_conversion-automd-sg2rg-revised-v2',
    // //   'kr-unfreeze_inactive-automd',
    // //   // 'kr-debit_fail-credit_card-automd',
    // //   // 'kr-debit_fail-CMS-automd'
    // // 'kr-new_donor_upgrade-automd',
    // // 'kr-202112-new-donor-upgrade-journey_2022'
    //   // 'tw-20201201-reactivation-journey-inactive-donor-single-create-tfr'
    // ]

    // start to process
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(journeyNames.length, 0);

    for (let i = 0; i < journeyNames.length; i++) {
      progressBar.update(i+1);

      const jName = journeyNames[i]
      let csvRow = null
      try {
        csvRow = await processJourney({ jName, mcJourney, mcJB, mcDE, mcAutomation })
      } catch (error) {
        logger.error(error);
        // throw error; // for debug
        continue
      }

      if (csvRow) {
        // Modify csvRow object to fill in "-" for empty values and show 0 for zero values
        csvKeys.forEach((key) => {
          if (csvRow[key] === undefined || csvRow[key] === null || csvRow[key] === "") {
            csvRow[key] = "-";
          } else if (csvRow[key] === 0) {
            csvRow[key] = 0;
          }
        });
        await csvWriter.writeRecords([csvRow]);
      }
    }
    progressBar.stop()
  }
}

async function processJourney(params) {
  let data

  const { mcJourney, mcJB, mcDE, mcAutomation, jName } = params;
  const csvRow = { journeyName: jName };

  const srcJ = await mcJB.loadSrcJourneyName(jName);
  mcJB.generateActivityWaitMap();
  params.srcJ = srcJ
  logger.info(`Read journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)

  data = await processTrigger(params);
  Object.assign(csvRow, data);

  data = await processCases(params);
  Object.assign(csvRow, data);

  data = await processEmail(params)
  Object.assign(csvRow, data);

  data = await processSms(params)
  Object.assign(csvRow, data);
  data = await processLms(params)
  if (data.smses!=='') {
    Object.assign(csvRow, data);
  }

  data = await process369Criteria(params);
  Object.assign(csvRow, data);

  return csvRow;
}

async function processTrigger({ srcJ, jName, mcJB, mcJourney, mcDE, mcAutomation }) {
  let returnObj = {
    triggerCriteria: '-',
    repeat: '-'
  }

  if (mcJB.isSFObjectTriggered()) {
    logger.info(`Journey "${jName}" is triggered by a Salesforce trigger.`);

    let triggers = srcJ.triggers
    let journeyTriggerCriteriaStr =
      `Trigger: ${_.get(triggers, '0.configurationArguments.objectApiName')} ${_.get(triggers, '0.configurationArguments.evaluationCriteriaSummary')}
${_.get(triggers, '0.configurationArguments.primaryObjectFilterSummary')}
${_.get(triggers, '0.configurationArguments.relatedObjectFilterSummary')}
`
    returnObj.triggerCriteria = journeyTriggerCriteriaStr
    returnObj.repeat = "Occurrence-based"
  } else if (mcJB.isAutomationTriggered() || mcJB.isJourneyScheduled()) {
    if (mcJB.isAutomationTriggered()) {
      logger.info(`Journey "${jName}" is triggered by a Automation Trigger.`);
    } else if (mcJB.isJourneyScheduled()) {
      logger.info(`Journey "${jName}" is triggered by a Journey Scheduled Trigger.`);
    }

    // Resolving [${jName}] definitions
    let eventDef = await mcJourney.getJourneyEventDefinitionsByJourneyName(jName)
    let deName = _.get(eventDef, 'dataExtensionName', null)

    // resolve the original de
    let de = await mcDE.findDeBy({ field: "Name", value: deName })
    let deId = de.ObjectID
    let deCustomerKey = de.CustomerKey
    logger.info(`Target DataExtension is ${deName} (CustomerKey:${deCustomerKey})`);

    // find the query definition which related to this DE
    let queryDefinitionsForDE = await mcAutomation.getQueryDefinitionsForDataExtension(deCustomerKey)

    if (queryDefinitionsForDE.length > 0) {
      let sqls = []
      for (let i = 0; i < queryDefinitionsForDE.length; i++) {
        let thisQryDef = queryDefinitionsForDE[i]
        let sql = thisQryDef.QueryText
        sqls.push(sql.replace(/(?<=SELECT)([\s\S]*?)(?=FROM)/i, ' '))
        logger.info(`QueryDefinition ${thisQryDef.Name} ${thisQryDef.TargetUpdateType} the dataExtension ${deName}`);
      }
      returnObj.triggerCriteria = sqls.join("\n")

      // find the original query definitions
      let automations = await mcAutomation.findAutomationsByQueryDefObjectIdRest(queryDefinitionsForDE[0].ObjectID)
      if ( !Array.isArray(automations)) {
        logger.warn(`Cannot find the automation by QueryDefinition ${queryDefinitionsForDE[0].Name} (${queryDefinitionsForDE[0].ObjectID})`)
      } else if (automations.length>1) {
        logger.warn(`Found more than 1 automation realted to this query definitions`)
        automations.forEach((automation, idx) => {
          logger.warn(`#${idx} Automation: ${automation.name} ${automation.id}`)
        })
      } else if (automations.length<1) {
        logger.warn(`Cannot find the automation by QueryDefinition ${queryDefinitionsForDE[0].Name} (${queryDefinitionsForDE[0].ObjectID})`)
      } else if (automations.length==1) { // exactly one automation
        let automation = automations[0]
        let automationScheduleIcalRecur = _.get(automation, 'schedule.icalRecur')
        let automationScheduledTime = _.get(automation, 'schedule.scheduledTime')
        let automationScheduleTimezoneName = _.get(automation, 'schedule.timezoneName')

        // convert to human readable schedule string
        let repeatDisplay = automationScheduleIcalRecur ?
          `${rruleToHumanReadable(automationScheduleIcalRecur)} ${automationScheduledTime.replace(/\d{4}-\d{2}-\d{2}T/, "")} ${automationScheduleTimezoneName}\n(Automation: ${automation.name})`
          :
          `(Automation: ${automation.name})`;

        logger.info(`Repeat: ${repeatDisplay}`);

        returnObj.repeat = repeatDisplay
      } else {
        logger.warn(`Cannot find the automation by QueryDefinition ${queryDefinitionsForDE[0].Name} (${queryDefinitionsForDE[0].ObjectID})`)
      }
    } else {
      logger.warn(`Cannot find the related query denition for de ${deName}`)
    }
  } else {
    // console.log(JSON.stringify(srcJ, null, 2)); // for debug
    logger.error(`Unknow-trigger type for journey ${jName} with type: ${_.get(srcJ, 'triggers.0.type')}` )
  }

  return returnObj
}
async function processCases({ srcJ, mcJB }) {
  const requiredFields = ['Subject', 'Case Origin', 'Campaign', 'Category', 'Sub Category']
  let returnObj = Object.fromEntries(requiredFields.map((field) => [field, '-']));

  let caseActitivies = srcJ.activities.filter(activity =>
    activity.configurationArguments.applicationExtensionKey === "Salesforce_Activity_Case");

  // Extract the required fields from each activity object
  const extractedFields = caseActitivies.map(activity => {
    const fields = _.get(activity, "arguments.objectMap.objects.0.fields");
    const extracted = {};
    if (fields) {
      fields.forEach(field => {
        if (requiredFields.includes(field.FieldLabel)) {
          // Format the field value as "FieldValue(FieldValueLabel)" if FieldValueLabel exists, otherwise just "FieldValue"
          extracted[field.FieldLabel] = field.FieldValueLabel && field.FieldValue !== field.FieldValueLabel
            ? `${field.FieldValueLabel} (${field.FieldValue})`
            : field.FieldValue;
        }
      });
    }

    extracted.minMinutesToThisActivity = mcJB.resolveActivityMinWaitMinutesFromEntry(activity.id)
    extracted.maxMinutesToThisActivity = mcJB.resolveActivityMaxWaitMinutesFromEntry(activity.id)

    extracted.minDaysToThisActivity = Math.floor(extracted.minMinutesToThisActivity / 1440)
    extracted.maxDaysToThisActivity = Math.ceil(extracted.maxMinutesToThisActivity / 1440)

    return extracted;
  });

  // prepare the printed CSV fils
  const concatenatedData = extractedFields.reduce((result, item) => {
    Object.keys(item).forEach(key => {
      const isMin = key.startsWith('min');
      const isMax = key.startsWith('max');
      const value = item[key];

      // The key is checked to see if it starts with "min" or "max". If it does, the corresponding value is compared
      // with the current value and the minimum or maximum value is stored in the result object.
      if (isMin || isMax) {
        if (result[key] === undefined) {
          result[key] = value;
        } else {
          result[key] = isMin ? Math.min(result[key], value) : Math.max(result[key], value);
        }
      } else {
        // If the key does not start with "min" or "max", the corresponding value is concatenated with any existing
        // value in the result object. If there is no existing value, the current value is stored in the result object.
        if (result[key] === undefined) {
          result[key] = value;
        } else if (result[key] !== value) {
          result[key] = `${result[key]}\n${value}`;
        }
      }
    });
    return result;
  }, {});

  Object.assign(returnObj, Object.fromEntries(requiredFields.map(field => [field, null]))) // ensure the field appear
  Object.assign(returnObj, concatenatedData)

  return returnObj
}
async function processEmail({ srcJ, mcJB }) {
  let returnObj = { emails: '-' }

  // List Emails
  let emailActivties = []
  srcJ.activities.forEach(act => {
    if (act.type === "EMAILV2") {
      emailActivties.push(act)
    }
  });

  emailActivties.sort((a, b) => { // sort by sending dates
    const aMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(a.id);
    const bMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(b.id);
    return aMinWait - bMinWait;
  });

  emailActivties.forEach((emailAct, idx) => {
    let emailSubject = _.get(emailAct, 'configurationArguments.triggeredSend.emailSubject')

  })

  returnObj.emails = emailActivties.map((emailAct, idx) => {
    let emailSubject = _.get(emailAct, 'configurationArguments.triggeredSend.emailSubject')
    logger.info(`Email ${idx + 1}: ${emailSubject} (${emailAct.name})`)
    return `#${idx + 1}: ${emailSubject} (${emailAct.name})`
  }).join("\n")

  return returnObj
}
async function processSms({ srcJ, mcJB }) {
  let returnObj = { smses: '-' }

  // List SMSs
  let smsActivities = []
  srcJ.activities.forEach(act => {
    if (act.type === "SMSSYNC") {
      smsActivities.push(act)
    }
  });
  smsActivities.sort((a, b) => {
    const aMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(a.id);
    const bMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(b.id);
    return aMinWait - bMinWait;
  });

  returnObj.smses = smsActivities.map((smsAct, idx) => {
    let smsContent = _.get(smsAct, 'metaData.store.selectedContentBuilderMessage', "")
    smsContent = smsContent.replace(/%%\[[\s\S]*?(?<!\\)\]%%/g, "").trim() // remove any text between %%[...]%%
    logger.info(`SMS ${idx + 1}: ${smsContent} (${smsAct.name})`)
    return `#${idx + 1}: ${smsContent} (${smsAct.name})`
  }).join("\n")

  return returnObj
}
async function processLms({ srcJ, mcJB }) {
  // TODO: Support LMS
  let returnObj = { smses: '-' }

  // List SMSs
  let lmsActivities = []
  srcJ.activities.forEach(act => {
    if (act.type==="REST" && _.get(act, "arguments.execute.inArguments.0.sendtype")=="LMS") {

      lmsActivities.push(act)
    }
  });
  lmsActivities.sort((a, b) => {
    const aMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(a.id);
    const bMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(b.id);
    return aMinWait - bMinWait;
  });

  returnObj.lmses = lmsActivities.map((aLmsAct, idx) => {
    let lmsName = _.get(aLmsAct, 'name')
    let lmsTitle = _.get(aLmsAct, 'arguments.execute.inArguments.0.title')
    let lmsContent = _.get(aLmsAct, 'arguments.execute.inArguments.0.msg')
    let paramData = _.get(aLmsAct, 'arguments.execute.inArguments.0.paramData')

    lmsContent = lmsContent.replace(/%%\[[\s\S]*?(?<!\\)\]%%/g, "").trim() // remove any text between %%[...]%%
    logger.info(`LMS ${idx + 1}: ${lmsContent} (${lmsName})`)
    return `#${idx + 1}: ${lmsContent} (${lmsName})`
  }).join("\n")

  return returnObj
}
async function process369Criteria({ srcJ }) {
  let returnObj = { use369: '-' }

  // List is using 369 rules to exclude call cases
  let found369DecisionSplitOutcomes = []
  srcJ.activities.forEach(act => {
    _.get(act, 'outcomes', []).forEach(outcome => {
      const labelIsStandard369 = _.get(outcome, 'metaData.label') === 'EXCLUDED_BY_369';
      const containsDoNotCallField = _.get(outcome, 'metaData.criteriaDescription', '').includes('Do_Not_Call_Before_This_Date__c');
      const containsLastCalledDate = _.get(outcome, 'metaData.criteriaDescription', '').includes('Last_Call_Date__c');
      const containsTFRCallOutcome = _.get(outcome, 'metaData.criteriaDescription', '').includes('TFR_Call_Outcome__c');
      const containsLastSuccessfulUpgrade = _.get(outcome, 'metaData.criteriaDescription', '').includes('Last_Successful_Upgrade__c');
      const containsLastSuccessfulDowngrade = _.get(outcome, 'metaData.criteriaDescription', '').includes('Last_Successful_Downgrade__c');
      const containsOutboundDirection = _.get(outcome, 'metaData.criteriaDescription', '').includes('Direction__c equal Outbound');

      if (
        labelIsStandard369
        || containsDoNotCallField
        || containsLastCalledDate
        || containsTFRCallOutcome
        || containsLastSuccessfulUpgrade
        || containsLastSuccessfulDowngrade
        || containsOutboundDirection
      ) {
        found369DecisionSplitOutcomes.push(outcome)
      }
    });
  });

  // console.log('found369DecisionSplitOutcomes', found369DecisionSplitOutcomes)
  if (found369DecisionSplitOutcomes.length) {
    returnObj.use369 = found369DecisionSplitOutcomes.map((anOutcome, idx) => {
      logger.info(`RULE ${idx}: ${anOutcome.metaData.label}\n    (${anOutcome.metaData.criteriaDescription})`)
      return `#${idx}: ${anOutcome.metaData.label}\n(${anOutcome.metaData.criteriaDescription})`
    }).join("\n")
  }

  return returnObj
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
