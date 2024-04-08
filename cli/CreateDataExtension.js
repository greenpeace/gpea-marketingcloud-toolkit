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
  let deName = 'tw-debit_fail-automd-hard_fail'

  let fields =[
    ///  
    { Name: "Id", FieldType: "Text" },
    { Name: "Constituent_ID__c", FieldType: "Text" },
    { Name: "Market__c", FieldType: "Text" },
    { Name: "FirstName", FieldType: "Text" },
    { Name: "LastName", FieldType: "Text" },
    { Name: "Email", FieldType: "EmailAddress" },
    { Name: "MobilePhone", FieldType: "Phone" },
    { Name: "HomePhone", FieldType: "Phone" },
    { Name: "Preferred_Language__c", FieldType: "Text" },
    { Name: "name", FieldType: "Text" },

    { Name: "First_Soft_Failure_Date__c", FieldType: "Date" },
    { Name: "First_Hard_Failure_Date__c", FieldType: "Date" },

    { Name: "Donor_Status__c", FieldType: "Text" },
    { Name: "Recurring_Donation_Status__c", FieldType: "Text" },

    { Name: "RD_Name", FieldType: "Text"},
    { Name: "RD_Status__c", FieldType: "Text"},
    { Name: "RD_Amount__c", FieldType: "Number"},
    { Name: "RD_Token_Expiry_Date__c", FieldType: "Date"},
    { Name: "RD_First_Donation_Date__c", FieldType: "Date"},
    { Name: "RD_Last_Donation_Date__c", FieldType: "Date"},
    { Name: "RD_Next_Donation_Date__c", FieldType: "Date"},
    { Name: "RD_Payment_Method__c", FieldType: "Text"},
    { Name: "RD_Credit_Card_Number_Last_Four__c", FieldType: "Text"},
    { Name: "RD_Card_Type__c", FieldType: "Text"},
    { Name: "RD_Sign_Up_Date__c", FieldType: "Date"},

    { Name: "ContactJourney_Id", FieldType: "Text" },
    { Name: "ContactJourney_Additional_Notes__c", FieldType: "Text" },
    { Name: "ContactJourney_Campaign__c", FieldType: "Text" },
    { Name: "ContactJourney_Contact__c", FieldType: "Text" },
    { Name: "ContactJourney_CreatedById", FieldType: "Text" },
    { Name: "ContactJourney_CreatedDate", FieldType: "Date" },
    { Name: "ContactJourney_Journey_Batch__c", FieldType: "Text" },
    { Name: "ContactJourney_Journey_End_Date__c", FieldType: "Date" },
    { Name: "ContactJourney_Journey_Name__c", FieldType: "Text" },
    { Name: "ContactJourney_Journey_Start_Date__c", FieldType: "Date" },
    { Name: "ContactJourney_Name", FieldType: "Text" },
    { Name: "ContactJourney_Ready_for_Journey__c", FieldType: "Text" },
    { Name: "ContactJourney_Recurring_Donation__c", FieldType: "Text" },

    { Name: "Do_Not_Contact__c", FieldType: "Boolean" },
    { Name: "Do_Not_Mail__c", FieldType: "Boolean" },
    { Name: "DoNotCall", FieldType: "Boolean" },
    { Name: "HasOptedOutOfEmail", FieldType: "Boolean" },
    { Name: "et4ae5__HasOptedOutOfMobile__c", FieldType: "Boolean" },
    { Name: "Fundraising_Appeals_Opt_Out__c", FieldType: "Boolean" },
    { Name: "Marketing_Opt_Out__c", FieldType: "Boolean" },
    { Name: "Do_Not_Call_Before_This_Date__c", FieldType: "Date" },

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

    { Name: "Locale", FieldType: "Locale" }
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
