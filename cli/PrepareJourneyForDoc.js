const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { rruleToHumanReadable } = require('../models/Utils/tools.js')

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
  const market = "HK"

  let mcbase = new MCBase({ market })

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')
  let mcDE = mcbase.factory('DataExtension')
  let mcAutomation = mcbase.factory('Automation')

  let journeyNames = [
    // 'tw-annual_reactivation-automd-long_lapsed',
    // 'tw-auto_greennews-automd-biweekly',
    // 'tw-comms-automd-activist_recruitment-20220314',
    // 'tw-dd_followup-automd-20220922',
    // 'tw-debit_fail-automd',
    // 'tw-debit_fail-automd-direct_debit_fail-20221116',
    // 'tw-drtv_bank_in-automd-nopayment_followup-20220101',
    // 'tw-drtv_bank_in-automd-thankyou-20220101',
    // 'tw-expired_card-automd',
    // 'tw-lead_conversion-automd-2022-climatecart-cart_checkout_succ-20220915',
    // 'tw-lead_conversion-automd-2022-climatecart-cart_no_checkout_reminder-20220915',
    // 'tw-lead_conversion-automd-2022_greenlife_handbook-20230101',
    // 'tw-lead_conversion-automd-abandon_cart-20230201',
    // 'tw-lead_conversion-automd-arctic-savethearctic',
    // 'tw-lead_conversion-automd-climate-20220606-mitigate_climatechange',
    // 'tw-lead_conversion-automd-climate-2022earthday',
    // 'tw-lead_conversion-automd-climate-climate_vote',
    // 'tw-lead_conversion-automd-climate-energy_bulkuser',
    // 'tw-lead_conversion-automd-climate-government_set_carbon_price',
    // 'tw-lead_conversion-automd-climate-greenhouse',
    // 'tw-lead_conversion-automd-climate-re10x10',
    // 'tw-lead_conversion-automd-forests-global_forests',
    // 'tw-lead_conversion-automd-general-dd_webinar_supporter',
    // 'tw-lead_conversion-automd-general-world_meatless_day',
    // 'tw-lead_conversion-automd-leftover_case_creation',
    // 'tw-lead_conversion-automd-netzeroevent-20230109',
    // 'tw-lead_conversion-automd-oceans-cwf_coastal_water_fisheries',
    // 'tw-lead_conversion-automd-oceans-cwf_handbook',
    // 'tw-lead_conversion-automd-oceans-cwf_protector',
    // 'tw-lead_conversion-automd-oceans-dwf_distant_water_fisheries',
    // 'tw-lead_conversion-automd-oceans-oceanssancturies-20220818',
    // 'tw-lead_conversion-automd-plastic-taoyuan',
    // 'tw-lead_conversion-automd-plastics-plasticanimal-20220704',
    // 'tw-lead_conversion-automd-plastics-plastics_policy',
    // 'tw-new_donor_upgrade-automd',
    // 'tw-oneoff_conversion-automd-sg2rg-20230113',
    // 'tw-oneoff_conversion-automd-sg2rg_quarterly_lapsed_donor-20230202',
    // 'tw-p8_new_subscription-automd-greennews_subscription',
    // 'tw-reactivation-automd-new_lapsed',
    // 'tw-transactional-automd-annual_receipt',
    // 'tw-transactional-automd-direct_debit_thank_you-20221116',
    // 'tw-transactional-automd-first_donation_receipt-20220920',
    // 'tw-transactional-automd-new_oneoff_by_donor',
    // 'tw-transactional-automd-new_rg_by_donor',
    // 'tw-transactional-automd-oneoff_refund',
    // 'tw-transactional-automd-rg_cancellation',
    // 'tw-transactional-automd-rg_downgrade',
    // 'tw-transactional-automd-rg_held',
    // 'tw-transactional-automd-rg_payment_method_update',
    // 'tw-transactional-automd-rg_resume_by_inbound_calls',
    // 'tw-transactional-automd-rg_resume_or_extend_by_outbound_calls',
    // 'tw-transactional-automd-rg_upgrade',
    // 'tw-unfreeze_inactive-automd',
    // 'tw-utils-automd-convert_cloudpage_leads_to_salesforce_contact-do_not_edit',
    // 'tw-utils-automd-einstein_engagement_frequency',
    // 'tw-welcome_new_donor-automd-20220311',

    // 'hk-dd_followup-automd',
    // 'hk-debit_fail-automd',
    // 'hk-debit_fail-automd-direct_debit_fail',
    // 'hk-debit_fail-automd-direct_debit_setup_fail',
    // 'hk-email-automd-20230221-email_oceansSanctuaries_chi_TFR_case',
    // 'hk-lead_conversion-automd-arctic-polarquiz',
    // 'hk-lead_conversion-automd-arctic-savethearctic',
    // 'hk-lead_conversion-automd-climate-climate_emergency',
    // 'hk-lead_conversion-automd-climate-climate_emergency_2022',
    // 'hk-lead_conversion-automd-climate-earthday-commitment',
    // 'hk-lead_conversion-automd-climate-labour-20230206',
    // 'hk-lead_conversion-automd-forests-amazon_forest',
    // 'hk-lead_conversion-automd-forests-global',
    // 'hk-lead_conversion-automd-general-elm',
    // 'hk-lead_conversion-automd-general-lantau-ebook',
    // 'hk-lead_conversion-automd-general-virtual-tour-around-asia',
    // 'hk-lead_conversion-automd-lantau-documentary-movie-referee',
    // 'hk-lead_conversion-automd-leftover_case_creation',
    // 'hk-lead_conversion-automd-oceans-antarctic_webinar-20230103',
    // 'Hk-lead_conversion-automd-oceans-antarctic_webinar-reminder_1',
    // 'Hk-lead_conversion-automd-oceans-antarctic_webinar-reminder_2',
    // 'hk-lead_conversion-automd-oceans-elm_generator-20230308',
    // 'hk-lead_conversion-automd-oceans-marinelife-ebook',
    // 'hk-lead_conversion-automd-oceans-ship-quiz',
    // 'hk-lead_conversion-automd-plastic-dpt-policy',
    // 'hk-lead_conversion-automd-plastics-downloadable',
    // 'hk-lead_conversion-automd-plastics-event-plastics-plasticfree_harbour_donor_registration',
    // 'hk-lead_conversion-automd-plastics-gps',
    // 'hk-lead_conversion-automd-plastics-plasticfree_harbour_art_submission',
    // 'hk-lead_conversion-automd-plastics-recyclebooklet',
    // 'hk-lead_conversion-automd-plastics-survey',
    // 'hk-lead_conversion-automd-web-transaction-failed-20230213',
    // 'hk-lead_conversion-automd-web-transaction-unfinished-20230213',
    'hk-new_donor_upgrade-automd',
    // 'hk-oneoff_conversion-automd-sg2rg-20220303',
    // 'hk-oneoff_conversion-automd-sg2rg-lantau-documentary-movie-20220517',
    // 'hk-oneoff_conversion-automd-sg2rg-plasticfree-harbour-public-20221209',
    // 'hk-oneoff_conversion-automd-sg2rg-plasticfree-harbour-thank_for_extra_donation',
    'hk-reactivation-automd-lapsed_donor',
    // 'hk-special_appeal-automd-rg-incentive-workshop-registration-20220601',
    // 'hk-special_appeal-automd-thankyou',
    // 'hk-transactional-automd-annual_receipt',
    // 'hk-transactional-automd-new_oneoff_by_donor',
    // 'hk-transactional-automd-new_rg_by_donor',
    // 'hk-transactional-automd-oneoff_refund',
    // 'hk-transactional-automd-rg_cancellation',
    // 'hk-transactional-automd-rg_downgrade',
    // 'hk-transactional-automd-rg_held',
    // 'hk-transactional-automd-rg_payment_method_update',
    // 'hk-transactional-automd-rg_reactivation',
    // 'hk-transactional-automd-rg_resume_by_inbound_calls',
    // 'hk-transactional-automd-rg_resume_or_extend_by_outbound_calls',
    // 'hk-transactional-automd-rg_upgrade',
    // 'hk-transactional-automd-welcome_new_donor_first_donation_receipt-20220401',
    'hk-unfreeze_inactive-automd-inactive_donor',
    // 'hk-utils-automd-einstein_engagement_frequency',
    'hk-welcome_new_donor-automd-for_rg_status_delay_population-20220311',
  ]

  // let allJourneys = await mcJourney.getAll()

  let csvRows = []
  let csvWriter = null

  for (let i = 0; i < journeyNames.length; i++) {
    let csvRow = {}

    const jName = journeyNames[i];
    csvRow.journeyName = jName

    let srcJ = await mcJB.loadSrcJourneyName(jName)
    mcJB.generateActivityWaitMap()

    // 1. Entry Criteria (if its in triggerd mode)
    logger.info(`Read journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)
    // console.log(JSON.stringify(srcJ, null, 2));

    csvRow.triggerCriteria = null
    csvRow.repeat = null
    if (mcJB.isSFObjectTriggered()) {
      let triggers = srcJ.triggers
      let journeyTriggerCriteriaStr =
        `Trigger: ${_.get(triggers, '0.configurationArguments.objectApiName')} ${_.get(triggers, '0.configurationArguments.evaluationCriteriaSummary')}
${_.get(triggers, '0.configurationArguments.primaryObjectFilterSummary')}
${_.get(triggers, '0.configurationArguments.relatedObjectFilterSummary')}
  `
      console.log('journeyTriggerCriteriaStr', journeyTriggerCriteriaStr)

      csvRow.triggerCriteria = journeyTriggerCriteriaStr

    } else if (mcJB.isAutomationTriggered()) {
      console.log('Triggered by Automation(SQL)')

      // find the trigger DE Name
      logger.info(`Resolving [${jName}] definitions …`)
      let eventDef = await mcJourney.getJourneyEventDefinitionsByJourneyName(jName)
      let deName = _.get(eventDef, 'dataExtensionName', null)

      // resolve the original de
      let de = await mcDE.findDeBy({ field: "Name", value: deName })
      let deId = de.ObjectID
      let deCustomerKey = de.CustomerKey

      // find the query definition which related to this DE
      let relatedQueryDefinitions = await mcAutomation.getQueryDefinitionsForDataExtension(deCustomerKey)

      if (relatedQueryDefinitions.length > 0) {
        let sqls = []
        for (let i = 0; i < relatedQueryDefinitions.length; i++) {
          let sql = relatedQueryDefinitions[i].QueryText
          sqls.push(sql.replace(/(?<=SELECT)([\s\S]*?)(?=FROM)/i, ' '))
        }
        csvRow.triggerCriteria = sqls.join("\n")

        // find the original query definitions
        console.log('find by relatedQueryDefinitions[0].ObjectID', relatedQueryDefinitions[0].ObjectID)
        let automation = await mcAutomation.findAutomationByQueryDefObjectIdRest(relatedQueryDefinitions[0].ObjectID)
        if (automation) {
          let automationScheduleIcalRecur = _.get(automation, 'schedule.icalRecur')
          let automationScheduledTime = _.get(automation, 'schedule.scheduledTime')
          let automationScheduleTimezoneName = _.get(automation, 'schedule.timezoneName')

          console.log(JSON.stringify(automation, null, 2));

          // console.log(JSON.stringify(automation.schedule, null, 2));

          let humanReadable = rruleToHumanReadable(automationScheduleIcalRecur);
          let repeatDisplay = `${humanReadable} ${automationScheduledTime.replace(/\d{4}-\d{2}-\d{2}T/, "")} ${automationScheduleTimezoneName}`

          csvRow.repeat = repeatDisplay
        } else {
          logger.warn(`Cannot find the automation by QueryDefinition ${relatedQueryDefinitions[0].Name} (${relatedQueryDefinitions[0].ObjectID})`)
        }
      } else {
        logger.warn(`Cannot find the related query denition for de ${deName}`)
      }


    } else {
      console.warn('Unknow-trigger type')
    }

    // TODO: Resolve it's from criteria or SQL.
    // If its SQL: pull the SQL and its' execution time.

    // 3. Call Case Details: OK
    let caseActitivies = srcJ.activities.filter(activity => activity.configurationArguments.applicationExtensionKey === "Salesforce_Activity_Case");

    // Extract the required fields from each activity object
    const requiredFields = ['Subject', 'Case Origin', 'Campaign', 'Category', 'Sub Category']
    const extractedFields = caseActitivies.map(activity => {
      const fields = activity.arguments.objectMap.objects[0].fields;
      const extracted = {};
      fields.forEach(field => {
        if (requiredFields.includes(field.FieldLabel)) {
          // Format the field value as "FieldValue(FieldValueLabel)" if FieldValueLabel exists, otherwise just "FieldValue"
          extracted[field.FieldLabel] = field.FieldValueLabel && field.FieldValue !== field.FieldValueLabel
            ? `${field.FieldValueLabel} (${field.FieldValue})`
            : field.FieldValue;
        }
      });

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

    Object.assign(csvRow, Object.fromEntries(requiredFields.map(field => [field, null]))) // ensure the field appear
    Object.assign(csvRow, concatenatedData)


    // this.isSFObjectTriggered()
    // this.isAutomationTriggered()

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

    emailActivties.forEach(emailAct => {
      let emailSubject = _.get(emailAct, 'configurationArguments.triggeredSend.emailSubject')
      console.log(`Email: ${emailSubject} (${emailAct.name})`)
    })

    csvRow.emails = emailActivties.map(emailAct => {
      let emailSubject = _.get(emailAct, 'configurationArguments.triggeredSend.emailSubject')
      return `Email: ${emailSubject} (${emailAct.name})`
    }).join("\n")

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
    smsActivities.forEach(smsAct => {
      let smsAssetId = _.get(smsAct, 'configurationArguments.assetId')
      let smsContent = _.get(smsAct, 'metaData.store.selectedContentBuilderMessage')
      smsContent = smsContent.replace(/%%\[[\s\S]*?(?<!\\)\]%%/g, "").trim() // remove any text between %%[...]%%
      console.log(`SMS: ${smsContent} (${smsAct.name})`)
    })

    csvRow.smses = smsActivities.map(smsAct => {
      let smsAssetId = _.get(smsAct, 'configurationArguments.assetId')
      let smsContent = _.get(smsAct, 'metaData.store.selectedContentBuilderMessage')
      smsContent = smsContent.replace(/%%\[[\s\S]*?(?<!\\)\]%%/g, "").trim() // remove any text between %%[...]%%
      return `SMS: ${smsContent} (${smsAct.name})`
    }).join("\n")

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
    csvRow.use369 = null
    if (found369DecisionSplitOutcomes.length) {
      let first369Outcome = found369DecisionSplitOutcomes[0]
      console.log(`Using 369 criteria with ${first369Outcome.metaData.label} (${first369Outcome.metaData.criteriaDescription})`)

      csvRow.use369 = `${first369Outcome.metaData.label}\n(${first369Outcome.metaData.criteriaDescription})`
    }


    if (!csvWriter) {
      csvWriter = createCsvWriter({
        path: csvFileName,
        header: Object.keys(csvRow).map((k) => { return { id: k, title: k } }),
        append: false
      });
    }

    // Modify csvRow object to fill in "-" for empty values and show 0 for zero values
    Object.keys(csvRow).forEach((key) => {
      if (csvRow[key] === undefined || csvRow[key] === null || csvRow[key] === "") {
        csvRow[key] = "-";
      } else if (csvRow[key] === 0) {
        csvRow[key] = 0;
      }
    });
    await csvWriter.writeRecords([csvRow]);
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
