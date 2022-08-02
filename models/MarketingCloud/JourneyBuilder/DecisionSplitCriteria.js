const MARKET_RELATED_DEFS = {
  tw: {
    UI_METADATA: "{&quot;groupToSetRelationshipId&quot;:&quot;fe966f2d-4cca-ea11-b83a-b883035bd8a1&quot;}",
    SYNCED_DE_RELATIONID_MAP: {
      'Donation__c_Salesforce_1': 'cc9b6f2d-4cca-ea11-b83a-b883035bd8a1',
      'Recurring_Donation__c_Salesforce_1': '549c6f2d-4cca-ea11-b83a-b883035bd8a1',
      'Case_Salesforce_1': 'e2986f2d-4cca-ea11-b83a-b883035bd8a1'
    }
  },
  hk: {
    UI_METADATA: "{&quot;groupToSetRelationshipId&quot;:&quot;a7355944-4bca-ea11-b83a-b883035bd8a1&quot;}",
    SYNCED_DE_RELATIONID_MAP: {
      'Donation__c_Salesforce_1': '753a5944-4bca-ea11-b83a-b883035bd8a1',
      'Recurring_Donation__c_Salesforce_1': 'TODO'
    }
  }
}

const DECISION_SPLIT_RULES_BY_SYNC_DE = {
  TMPL: {
    description: "",
    criteria: ""
  },

  EMAIL_OPT_OUT: {
    "description": "HasOptedOutOfEmail is True OR Fundraising_Appeals_Opt_Out__c is True",
    "criteria": `
      <FilterDefinition> <ConditionSet Operator="OR" ConditionSetName="Individual Filter Grouping"> <Condition Key="Contact_Salesforce_1.HasOptedOutOfEmail" Operator="Is" UiMetaData="_UI_METADATA_"> <Value> <![CDATA[true]]> </Value> </Condition> <Condition Key="Contact_Salesforce_1.Fundraising_Appeals_Opt_Out__c" Operator="Is" UiMetaData="_UI_METADATA_"> <Value> <![CDATA[true]]> </Value> </Condition> </ConditionSet> </FilterDefinition>
    `
  },
  
  EMAIL_IS_VALID: {
    description: "Email contains @ AND Email does not contain noaddress",
    criteria: `<FilterDefinition><ConditionSet Operator="AND" ConditionSetName="Individual Filter Grouping"><Condition Key="Contact_Salesforce_1.Email" Operator="Contains" UiMetaData="_UI_METADATA_"><Value><![CDATA[@]]></Value></Condition><Condition Key="Contact_Salesforce_1.Email" Operator="NotContains" UiMetaData="_UI_METADATA_"><Value><![CDATA[noaddress]]></Value></Condition></ConditionSet></FilterDefinition>`
  },

  EMAIL_NOT_VALID: {
    description: "Email is null  OR Email does not contain @ OR Email contains noaddress",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Email\" Operator=\"IsNull\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Email\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[@]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Email\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[noaddress]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  CALL_OPT_OUT: {
    description: "DoNotCall is True OR Fundraising_Appeals_Opt_Out__c is True",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.DoNotCall\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Fundraising_Appeals_Opt_Out__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  PHONE_IS_VALID_TW: {
    description: "MobilePhone contains +886 AND MobilePhone does not contain 0000000 AND MobilePhone does not contain 1234567 AND MobilePhone does not contain 28548338",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[+886]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[0000000]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[1234567]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[28548338]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  PHONE_IS_VALID_HK: {
    description: "MobilePhone contains +852 AND MobilePhone does not contain 0000000 AND MobilePhone does not contain 1234567 AND MobilePhone does not contain 28548338",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[+852]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[0000000]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[1234567]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[28548338]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  PHONE_NOT_VALID_TW: {
    description: "MobilePhone is null  OR MobilePhone does not contain +886 OR MobilePhone contains 0000000 OR MobilePhone contains 1234567 OR MobilePhone contains 28548338",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"IsNull\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[+886]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[0000000]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[1234567]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[28548338]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  PHONE_NOT_VALID_HK: {
    description: "MobilePhone is null  OR MobilePhone does not contain +852 OR MobilePhone contains 0000000 OR MobilePhone contains 1234567 OR MobilePhone contains 28548338",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"IsNull\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"NotContains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[+852]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[0000000]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[1234567]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.MobilePhone\" Operator=\"Contains\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[28548338]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  IN_OTHER_JOURNEY: {
    description: "In_Petition_Journey_MC is True",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"In_Petition_Journey_MC_LC_Management.In_Petition_Journey_MC\" Operator=\"Is\" UiMetaData=\"{&quot;groupToSetRelationshipId&quot;:&quot;5047e7e4-c2f0-ea11-b83f-b883035b89e1&quot;}\"><Value><![CDATA[true]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  DONATED_BEFORE: {
    description: "Number_of_Donations_All_Time__c greater than 0",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Number_of_Donations_All_Time__c\" Operator=\"GreaterThan\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[0]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  DONATED_RECENTLY: {
    description: "Date__c is on or after Today Minus 14 days andStatus__c equal Processed",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Donation__c_Salesforce_1.Date__c\" Operator=\"AtOrAfter\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[;-;14;days]]></Value></AttributePath></Condition><Condition Key=\"Donation__c_Salesforce_1.Status__c\" Operator=\"Equal\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[Processed]]></Value></AttributePath></Condition></ConditionSet></FilterDefinition>"
  },

  DONATED_SG_RECENTLY: {
    description: "Date__c is on or after Today Minus 14 days andStatus__c equal Processed andIs_Recurring_Donation__c is False",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Donation__c_Salesforce_1.Date__c\" Operator=\"AtOrAfter\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[;-;14;days]]></Value></AttributePath></Condition><Condition Key=\"Donation__c_Salesforce_1.Status__c\" Operator=\"Equal\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[Processed]]></Value></AttributePath></Condition><Condition Key=\"Donation__c_Salesforce_1.Is_Recurring_Donation__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[false]]></Value></AttributePath></Condition></ConditionSet></FilterDefinition>"
  },

  DONATED_RG_RECENTLY: {
    description: "Date__c is on or after Today Minus 14 days AND Status__c equal Processed AND Is_Recurring_Donation__c is True",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Donation__c_Salesforce_1.Date__c\" Operator=\"AtOrAfter\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[;-;14;days]]></Value></AttributePath></Condition><Condition Key=\"Donation__c_Salesforce_1.Status__c\" Operator=\"Equal\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[Processed]]></Value></AttributePath></Condition><Condition Key=\"Donation__c_Salesforce_1.Is_Recurring_Donation__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Donation__c_Salesforce_1_\"><Value><![CDATA[true]]></Value></AttributePath></Condition></ConditionSet></FilterDefinition>"
  },

  UPGRADED_RECENTLY: {
    description: "Last_Successful_Upgrade__c is on or after Today Minus 14 days",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Last_Successful_Upgrade__c\" Operator=\"AtOrAfter\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[;-;14;days]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  EXCLUDED_BY_369: {
    description: "Do_Not_Call_Before_This_Date__c is on or after Today",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Do_Not_Call_Before_This_Date__c\" Operator=\"AtOrAfter\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[;+;0;days]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  TOO_YOUNG_TW: {
    description: "Age__c less than or equal 24",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Age__c\" Operator=\"LessThanOrEqual\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[24]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  TOO_YOUNG_HK: {
    description: "Age__c less than or equal 19",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Age__c\" Operator=\"LessThanOrEqual\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[19]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  PREF_ENG: {
    description: "Preferred_Language__c equal English",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Preferred_Language__c\" Operator=\"Equal\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[English]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  STILL_HAVE_OPENED_CASE: {
    description: "IsClosed is False AND CreatedDate is on or after Today Minus 90 days",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Case_Salesforce_1.IsClosed\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Case_Salesforce_1_\"><Value><![CDATA[false]]></Value></AttributePath></Condition><Condition Key=\"Case_Salesforce_1.CreatedDate\" Operator=\"AtOrAfter\" UiMetaData=\"_UI_METADATA_\"><AttributePath RelationshipID=\"_Case_Salesforce_1_\"><Value><![CDATA[;-;90;days]]></Value></AttributePath></Condition></ConditionSet></FilterDefinition>"
  },

  PREF_ENG: {
    description: "Preferred_Language__c equal English",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Preferred_Language__c\" Operator=\"Equal\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[English]]></Value></Condition></ConditionSet></FilterDefinition>"
  },
  
  INTERESTS_DEFINED: {
    description: "Interested_In_Arctic__c is True OR Interested_In_Climate__c is True OR Interested_In_Forest__c is True OR Interested_In_Health__c is True OR Interested_In_Oceans__c is True OR Interested_In_Plastics__c is True OR Interested_In_Nuclear__c is True",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition Key=\"Contact_Salesforce_1.Interested_In_Arctic__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Interested_In_Climate__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Interested_In_Forest__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Interested_In_Health__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Interested_In_Oceans__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Interested_In_Plastics__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition><Condition Key=\"Contact_Salesforce_1.Interested_In_Nuclear__c\" Operator=\"Is\" UiMetaData=\"_UI_METADATA_\"><Value><![CDATA[true]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  "DONATED_RECENTLY": {
    "description": "Date__c is on or after Today Minus 14 days andStatus__c equal Processed",
    "criteria": `
      <FilterDefinition>
          <ConditionSet Operator="AND" ConditionSetName="Individual Filter Grouping">
              <Condition Key="Donation__c_Salesforce_1.Date__c" Operator="AtOrAfter" UiMetaData="_UI_METADATA_">
                  <AttributePath RelationshipID="_Donation__c_Salesforce_1_">
                      <Value>
                          <![CDATA[;-;14;days]]>
                      </Value>
                  </AttributePath>
              </Condition>
              <Condition Key="Donation__c_Salesforce_1.Status__c" Operator="Equal" UiMetaData="_UI_METADATA_">
                  <AttributePath RelationshipID="_Donation__c_Salesforce_1_">
                      <Value>
                          <![CDATA[Processed]]>
                      </Value>
                  </AttributePath>
              </Condition>
          </ConditionSet>
      </FilterDefinition>
    `
  },
}

const DECISION_SPLIT_RULES_BY_ENTRY_DE = {
  EMAIL_OPT_OUT: {
    description: "HasOptedOutOfEmail is True OR Fundraising_Appeals_Opt_Out__c is True",
    "criteria": "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:et4ae5__HasOptedOutOfMobile__c\" Operator=\"Is\" UiMetaData=\"{}\"><Value><![CDATA[true]]></Value></Condition></ConditionSet></FilterDefinition>"
  },
  
  EMAIL_IS_VALID: {
    description: "Email contains @ AND Email does not contain noaddress",
    criteria: "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:Email\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[@]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:Email\" Operator=\"NotContains\" UiMetaData=\"{}\"><Value><![CDATA[noaddress]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  EMAIL_NOT_VALID: {
    description: "Email is null  OR Email does not contain @ OR Email contains noaddress",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:Email\" Operator=\"NotContains\" UiMetaData=\"{}\"><Value><![CDATA[@]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:Email\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[noaddress]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  CALL_OPT_OUT: {
    description: "DoNotCall is True OR Fundraising_Appeals_Opt_Out__c is True",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:DoNotCall\" Operator=\"Is\" UiMetaData=\"{}\"><Value><![CDATA[true]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:Fundraising_Appeals_Opt_Out__c\" Operator=\"Is\" UiMetaData=\"{}\"><Value><![CDATA[true]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  PHONE_IS_VALID_TW: {
    description: "MobilePhone contains +886 AND MobilePhone does not contain 0000000 AND MobilePhone does not contain 1234567 AND MobilePhone does not contain 28548338",
    criteria: "<FilterDefinition> <ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"> <Value> <![CDATA[+886]]> </Value> </Condition> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"> <Value> <![CDATA[0000000]]> </Value> </Condition> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"> <Value> <![CDATA[1234567]]> </Value> </Condition> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"> <Value> <![CDATA[28548338]]> </Value> </Condition> </ConditionSet> </FilterDefinition>"
  },

  PHONE_IS_VALID_HK: {
    description: "MobilePhone contains +852 AND MobilePhone does not contain 0000000 AND MobilePhone does not contain 1234567 AND MobilePhone does not contain 28548338",
    criteria: "<FilterDefinition> <ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"> <Value> <![CDATA[+852]]> </Value> </Condition> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"> <Value> <![CDATA[0000000]]> </Value> </Condition> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"> <Value> <![CDATA[1234567]]> </Value> </Condition> <Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"> <Value> <![CDATA[28548338]]> </Value> </Condition> </ConditionSet> </FilterDefinition>"
  },

  PHONE_NOT_VALID_TW: {
    description: "CampaignMember:Contact:MobilePhone does not contain +886 OR CampaignMember:Contact:MobilePhone contains 0000000 OR CampaignMember:Contact:MobilePhone contains 1234567 OR CampaignMember:Contact:MobilePhone contains 28548338",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"><Value><![CDATA[+886]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[0000000]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[1234567]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[28548338]]></Value></Condition></ConditionSet></FilterDefinition>"
  },

  PHONE_NOT_VALID_HK: {
    description: "CampaignMember:Contact:MobilePhone does not contain +852 OR CampaignMember:Contact:MobilePhone contains 0000000 OR CampaignMember:Contact:MobilePhone contains 1234567 OR CampaignMember:Contact:MobilePhone contains 28548338",
    criteria: "<FilterDefinition><ConditionSet Operator=\"OR\" ConditionSetName=\"Individual Filter Grouping\"><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"NotContains\" UiMetaData=\"{}\"><Value><![CDATA[+852]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[0000000]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[1234567]]></Value></Condition><Condition IsEphemeralAttribute=\"true\" Key=\"_ENTRY_EVENT_._ENTRY_OEJECT_:Contact:MobilePhone\" Operator=\"Contains\" UiMetaData=\"{}\"><Value><![CDATA[28548338]]></Value></Condition></ConditionSet></FilterDefinition>"
  },


}

// // prepare the market definitions
// let rules = {
//   tw: Object.assign({}, DECISION_SPLIT_RULES),
//   hk: Object.assign({}, DECISION_SPLIT_RULES)
// }

// // replace all the placeholders
// Object.keys(rules).forEach(market => {
//   Object.keys(rules[market]).forEach(criteriaKey => {
//     let criteria = rules[market][criteriaKey].criteria

//     // update the market ui_metadata
//     criteria = criteria.replace(new RegExp(`_UI_METADATA_`, 'g'), MARKET_RELATED_DEFS[market].UI_METADATA)
    
//     // replace the relation ids
//     Object.keys(MARKET_RELATED_DEFS[market].SYNCED_DE_RELATIONID_MAP).forEach (deName => {
//       criteria = criteria.replace(new RegExp(`_${deName}_`, 'g'), 
//         MARKET_RELATED_DEFS[market].SYNCED_DE_RELATIONID_MAP[deName])
//     })

//     rules[market][criteriaKey].criteria = criteria
//   })
// })

module.exports = {
  // TW_JOURNEY_DECISION_SPLIT_RULES: rules.tw,
  // HK_JOURNEY_DECISION_SPLIT_RULES: rules.hk,

  MARKET_RELATED_DEFS,
  DECISION_SPLIT_RULES_BY_SYNC_DE,
  DECISION_SPLIT_RULES_BY_ENTRY_DE
}