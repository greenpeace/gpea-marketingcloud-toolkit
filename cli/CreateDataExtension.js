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
  let market = "TW"
  let deName = 'hk-debit_fail-automd-weekly_reminder'

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

    { Name: "Id", FieldType: "Text" },
    { Name: "Constituent_ID__c", FieldType: "Text" },
    { Name: "Market__c", FieldType: "Text" },
    { Name: "FirstName", FieldType: "Text" },
    { Name: "LastName", FieldType: "Text" },
    { Name: "name", FieldType: "Text" },
    { Name: "Email", FieldType: "EmailAddress" },
    { Name: "MobilePhone", FieldType: "Phone" },
    { Name: "HomePhone", FieldType: "Phone" },
    { Name: "Preferred_Language__c", FieldType: "Text" },

    { Name: "Days_Since_soft_Fail", FieldType: "Number" },
    { Name: "Days_Since_hard_Fail", FieldType: "Number" },
    { Name: "WEEKNUMBER", FieldType: "Number" },
    { Name: "SHOULD_SEND_SMS", FieldType: "Number" },

    { Name: "First_Soft_Failure_Date__c", FieldType: "Date" },
    { Name: "First_Hard_Failure_Date__c", FieldType: "Date" },
    { Name: "RD_Last_Donation_Date__c", FieldType: "Date" },
    { Name: "RD_Sign_Up_Date__c", FieldType: "Date" },

    { Name: "Donor_Status__c", FieldType: "Text" },
    { Name: "Recurring_Donation_Status__c", FieldType: "Text" },
    { Name: "RD_Payment_Method__c", FieldType: "Text" },

    { Name: "Do_Not_Contact__c", FieldType: "Boolean"},
    { Name: "Do_Not_Mail__c", FieldType: "Boolean"},
    { Name: "DoNotCall", FieldType: "Boolean"}, ,
    { Name: "HasOptedOutOfEmail", FieldType: "Boolean"},
    { Name: "et4ae5__HasOptedOutOfMobile__c", FieldType: "Boolean"},
    { Name: "Fundraising_Appeals_Opt_Out__c", FieldType: "Boolean"}, ,
    { Name: "Marketing_Opt_Out__c", FieldType: "Boolean"}, ,
    { Name: "Do_Not_Call_Before_This_Date__c", FieldType: "Date"}, ,

    { Name: "First_Donation_Amount__c", FieldType: "Number" },
    { Name: "First_Donation_Date__c", FieldType: "Date" },
    { Name: "Last_Successful_Downgrade__c", FieldType: "Date" },
    { Name: "Last_Successful_Upgrade__c", FieldType: "Date" },
    { Name: "Last_Donation_Amount__c", FieldType: "Number" },
    { Name: "Last_Donation_Date__c", FieldType: "Date" },


    { Name: "Recurring_Donation_ID__c", FieldType: "Text" },
    { Name: "Recurring_Donation__c", FieldType: "Text" },
    { Name: "Recurring_Donation_Amount__c", FieldType: "Number" },
    { Name: "CurrencyIsoCode", FieldType: "Text" },
    { Name: "Recurring_Donation_Next_Donation_Date__c", FieldType: "Date" },
    { Name: "Recurring_Donation_Payment_Method__c", FieldType: "Text" },

    { Name: "Total_Donations_All_Time__c", FieldType: "Number" },
    { Name: "Total_Donations_Oneoff__c", FieldType: "Number" },
    { Name: "Total_Donations_Recurring__c", FieldType: "Number" },
    { Name: "Number_of_Donations_All_Time__c", FieldType: "Number" },
    { Name: "Last_Oneoff_Donation_Amount__c", FieldType: "Number" },
    { Name: "Last_Recurring_Donation_Amount__c", FieldType: "Number" },

    { Name: "Locale", FieldType: "Locale"}
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
    isSendable: true,
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
