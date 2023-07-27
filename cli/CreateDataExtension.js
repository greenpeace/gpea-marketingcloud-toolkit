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
  let market = "kr"
  let deName = 'kr-data_view-Job'

  let fields =[
    // { Name: "Id", FieldType: "Text", IsPrimaryKey: true, IsRequired: true},
    // { Name: "Batch", FieldType: "Text"},
    // { Name: "Constituent_ID__c", FieldType: "Text"}, ,
    // { Name: "Market__c", FieldType: "Text"}, ,
    // { Name: "MarketName", FieldType: "Text"}, ,
    // { Name: "FirstName", FieldType: "Text"}, ,
    // { Name: "LastName", FieldType: "Text"}, ,
    // { Name: "name", FieldType: "Text"},
    // { Name: "Email", FieldType: "EmailAddress"}, ,
    // { Name: "mobilephone", FieldType: "Phone"},
    // { Name: "Preferred_Language__c", FieldType: "Text"}, ,
    // { Name: "Value_Status__c", FieldType: "Text"}, ,

    // { Name: "Donor_Status__c", FieldType: "Text"}, ,
    // { Name: "Recurring_Donation_Status__c", FieldType: "Text"}, ,

    // { Name: "Days_Since_Last_Successful_Downgrade__c", FieldType: "Number"}, ,
    // { Name: "Days_Since_Last_Successful_Upgrade__c", FieldType: "Number"}, ,

    // { Name: "DoNotContact", FieldType: "Boolean"},
    // { Name: "DoNotMail", FieldType: "Boolean"},
    // { Name: "DoNotCall", FieldType: "Boolean"}, ,
    // { Name: "DoNotEmail", FieldType: "Boolean"},
    // { Name: "DoNotSMS", FieldType: "Boolean"},
    // { Name: "Fundraising_Appeals_Opt_Out__c", FieldType: "Boolean"}, ,
    // { Name: "Marketing_Opt_Out__c", FieldType: "Boolean"}, ,
    // { Name: "Do_Not_Call_Before_This_Date__c", FieldType: "Date"}, ,

    // { Name: "First_Donation_Amount__c", FieldType: "Decimal"}, ,
    // { Name: "First_Donation_Date__c", FieldType: "Date"}, ,
    // { Name: "Last_Successful_Downgrade__c", FieldType: "Date"}, ,
    // { Name: "Last_Successful_Upgrade__c", FieldType: "Date"}, ,
    // { Name: "Last_Donation_Amount__c", FieldType: "Decimal"}, ,
    // { Name: "Last_Donation_Date__c", FieldType: "Date"}, ,

    // { Name: "Recurring_Donation_ID__c", FieldType: "Text"}, ,
    // { Name: "Recurring_Donation__c", FieldType: "Text"}, ,
    // { Name: "Recurring_Donation_Amount__c", FieldType: "Decimal"}, ,
    // { Name: "CurrencyIsoCode", FieldType: "Text"}, ,
    // { Name: "Recurring_Donation_Next_Donation_Date__c", FieldType: "Date"}, ,
    // { Name: "Recurring_Donation_Payment_Method__c", FieldType: "Text"}, ,

    // { Name: "Total_Donations_All_Time__c", FieldType: "Number"}, ,
    // { Name: "Total_Donations_Oneoff__c", FieldType: "Number"}, ,
    // { Name: "Total_Donations_Recurring__c", FieldType: "Number"}, ,
    // { Name: "Number_of_Donations_All_Time__c", FieldType: "Number"}, ,
    // { Name: "Last_Oneoff_Donation_Amount__c", FieldType: "Decimal"}, ,
    // { Name: "Last_Recurring_Donation_Amount__c", FieldType: "Decimal"},

    // { Name: "Locale", FieldType: "Locale"},

    { Name: "JobID", FieldType: "Number" },
    { Name: "EmailID", FieldType: "Number" },
    { Name: "AccountID", FieldType: "Number" },
    { Name: "AccountUserID", FieldType: "Number" },
    { Name: "FromName", FieldType: "Text" },
    { Name: "FromEmail", FieldType: "Text" },
    { Name: "SchedTime", FieldType: "Date" },
    { Name: "PickupTime", FieldType: "Date" },
    { Name: "DeliveredTime", FieldType: "Date" },
    { Name: "EventID", FieldType: "Text" },
    { Name: "IsMultipart", FieldType: "Boolean" },
    { Name: "JobType", FieldType: "Text" },
    { Name: "JobStatus", FieldType: "Text" },
    { Name: "ModifiedBy", FieldType: "Number" },
    { Name: "ModifiedDate", FieldType: "Date" },
    { Name: "EmailName", FieldType: "Text" },
    { Name: "EmailSubject", FieldType: "Text" },
    { Name: "IsWrapped", FieldType: "Boolean" },
    { Name: "TestEmailAddr", FieldType: "Text" },
    { Name: "Category", FieldType: "Text" },
    { Name: "BccEmail", FieldType: "Text" },
    { Name: "OriginalSchedTime", FieldType: "Date" },
    { Name: "CreatedDate", FieldType: "Date" },
    { Name: "CharacterSet", FieldType: "Text" },
    { Name: "IPAddress", FieldType: "Text" },
    { Name: "SalesForceTotalSubscriberCount", FieldType: "Number" },
    { Name: "SalesForceErrorSubscriberCount", FieldType: "Number" },
    { Name: "SendType", FieldType: "Text" },
    { Name: "DynamicEmailSubject", FieldType: "Text" },
    { Name: "SuppressTracking", FieldType: "Boolean" },
    { Name: "SendClassificationType", FieldType: "Text" },
    { Name: "SendClassification", FieldType: "Text" },
    { Name: "ResolveLinksWithCurrentData", FieldType: "Boolean" },
    { Name: "EmailSendDefinition", FieldType: "Text" },
    { Name: "DeduplicateByEmail", FieldType: "Boolean" },
    { Name: "TriggererSendDefinitionObjectID", FieldType: "Text" },
    { Name: "TriggeredSendCustomerKey", FieldType: "Text" },
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
    fields,
    isSendable: false,
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
