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
  let market = "tw"
  let deName = 'up-utils-automd-opens_clicks_statistic-1145'

  let fields =[
    { Name: "Id", FieldType: "Text", IsPrimaryKey: true, IsRequired: true},
    { Name: "Market__c", FieldType: "Text" },
    { Name: "FirstName", FieldType: "Text" },
    { Name: "LastName", FieldType: "Text" },
    { Name: "Email", FieldType: "EmailAddress" },
    { Name: "Mobile", FieldType: "Phone" },
    { Name: "Donor_Status__c", FieldType: "Text" },
    { Name: "Recurring_Donation_Status__c", FieldType: "Text" },
    { Name: "DoNotCall", FieldType: "Boolean" },
    { Name: "DoNotContact", FieldType: "Boolean" },
    { Name: "DoNotEmail", FieldType: "Boolean" },
    { Name: "Contact_CreatedDate", FieldType: "Date" },
    { Name: "Last_Click_Date", FieldType: "Date" },
    { Name: "Last_Open_Date", FieldType: "Date" },
    { Name: "In3Months_Clicks", FieldType: "Number" },
    { Name: "In3Months_OpenRate", FieldType: "Decimal" },
    { Name: "In3Months_Opens", FieldType: "Number" },
    { Name: "In3Months_OpenToClickRate", FieldType: "Decimal" },
    { Name: "In3Months_Sends", FieldType: "Number" },
    { Name: "In3Months_SendToClickRate", FieldType: "Decimal" },
    { Name: "In6Months_Clicks", FieldType: "Number" },
    { Name: "In6Months_OpenRate", FieldType: "Decimal" },
    { Name: "In6Months_Opens", FieldType: "Number" },
    { Name: "In6Months_OpenToClickRate", FieldType: "Decimal" },
    { Name: "In6Months_Sends", FieldType: "Number" },
    { Name: "In6Months_SendToClickRate", FieldType: "Decimal" },
    { Name: "In12Months_Clicks", FieldType: "Number" },
    { Name: "In12Months_OpenRate", FieldType: "Decimal" },
    { Name: "In12Months_Opens", FieldType: "Number" },
    { Name: "In12Months_OpenToClickRate", FieldType: "Decimal" },
    { Name: "In12Months_Sends", FieldType: "Number" },
    { Name: "In12Months_SendToClickRate", FieldType: "Decimal" },
    { Name: "In24Months_Clicks", FieldType: "Number" },
    { Name: "In24Months_OpenRate", FieldType: "Decimal" },
    { Name: "In24Months_Opens", FieldType: "Number" },
    { Name: "In24Months_OpenToClickRate", FieldType: "Decimal" },
    { Name: "In24Months_Sends", FieldType: "Number" },
    { Name: "In24Months_SendToClickRate", FieldType: "Decimal" },
    { Name: "Total_Clicks", FieldType: "Number" },
    { Name: "Total_Opens", FieldType: "Number" },
    { Name: "Total_Sends", FieldType: "Number" },
    { Name: "Block_Bounce_Count", FieldType: "Number" },
    { Name: "Hard_Bounce_Count", FieldType: "Number" },
    { Name: "Soft_Bounce_Count", FieldType: "Number" },
    { Name: "ConversionLikelihood", FieldType: "Text" },
    { Name: "EinsteinEmailFrequency", FieldType: "Text" },
    { Name: "EmailClickLikelihood", FieldType: "Text" },
    { Name: "EmailEngagementPersona", FieldType: "Text" },
    { Name: "EMAIL_NOT_VALID", FieldType: "Boolean" },
    { Name: "EMAIL_OPT_OUT", FieldType: "Boolean" },
    { Name: "PHONE_NOT_VALID", FieldType: "Boolean" },
    { Name: "In_En_Hard_Bounce_Exclusion", FieldType: "Boolean" },
    { Name: "In_En_Not_Open_Last_12_Month_Exclusion", FieldType: "Boolean" },
    { Name: "Is_Excluded_Microsoft_Email", FieldType: "Boolean" },
    { Name: "IN_JOURNEY", FieldType: "Boolean" },
    { Name: "In_ebull", FieldType: "Boolean" },
    { Name: "in_enews", FieldType: "Boolean" },
  ]


  // main
  let mcbase = new MCBase({market})

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')
  let mcEmail = mcbase.factory('Email')
  let mcDE = mcbase.factory('DataExtension')

  // resolve the original de
  let r = await mcDE.createDataExtension({
    deName,
    fields
  })

  console.log(JSON.stringify(r, null, 4));
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
