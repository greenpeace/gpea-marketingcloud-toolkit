const axios = require('axios');
const logger = require('../../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')

const {
  MARKET_RELATED_DEFS,
  DECISION_SPLIT_RULES_BY_SYNC_DE,
  DECISION_SPLIT_RULES_BY_ENTRY_DE } = require('./DecisionSplitCriteria.js')



const ICON_RULE_FROM_TRIGGERED_DE = '👽'
const ICON_RULE_FROM_SYNC_DE = '🤖'

class JourneyBuilder {
  constructor(options) {
    this.market = null // "tw", "hk"
    this.srcJ = null
    this.nextJ = null

    this.decisionSplitRulesBySyncDe = DECISION_SPLIT_RULES_BY_SYNC_DE
    this.decisionSplitRulesByEntryDe = DECISION_SPLIT_RULES_BY_ENTRY_DE

    this.triggerEventDefinitionKey = null
    this.triggerObjectApiName = null
  }


  /**
   * Read the journey setting.
   *
   * @param {string} The journey name
   * @returns
   */
  async loadSrcJourneyName(jName) {
    // find the source journey
    // let r = await mcJourney.findByName('up-test-de_entry-20220706-src')
    let mcJourney = this.parent.factory('Journey')
    let r = await mcJourney.findByName(jName, { mostRecentVersionOnly: true })
    let srcJ = this.srcJ = _.get(r, 'items.0', null)

    if (!srcJ) {
      throw new Error(`Cannot find the source ${jName} journey`)
    }

    // resolve market
    return this.srcJ
  }

  setMarket(market) {
    market = market.toLowerCase()

    if (["tw", "hk", "kr"].indexOf(market) < 0) {
      throw new Error("The market should be one of tw, hk or kr")
    }

    this.market = market
    return this.market
  }

  /**
   * Prepare the pre-defined decision split criteria which will be used to replace the rules.
   */
  patchDecisionSplitCriteria() {
    if (!this.market) { throw new Error("You must setMarket before using this function.") }

    this.patchRule_UIMETADATA()
    this.patchRule_DeRelationIds()

    if (this.isSFObjectTriggered()) {
      this.patchRule_TriggeredDe()
    }
  }

  /**
   * Replace the UiMetada value used for the decision split fields.
   */
  patchRule_UIMETADATA() {
    let rule = this.decisionSplitRulesBySyncDe

    // replace all the placeholders
    Object.keys(rule).forEach(pathName => {
      rule[pathName].criteria =
        rule[pathName].criteria.replace(new RegExp(`_UI_METADATA_`, 'g'), MARKET_RELATED_DEFS[this.market].UI_METADATA)
    })

    this.decisionSplitRulesBySyncDe = rule
  }

  /**
   * Replace the Data Extension RelationId which used for the decision split rules
   */
  patchRule_DeRelationIds() {
    let rule = this.decisionSplitRulesBySyncDe

    // replace all the placeholders
    Object.keys(rule).forEach(pathName => {
      let criteria = rule[pathName].criteria

      // replace the relation ids
      Object.keys(MARKET_RELATED_DEFS[this.market].SYNCED_DE_RELATIONID_MAP).forEach(deName => {
        criteria = criteria.replace(new RegExp(`_${deName}_`, 'g'),
          MARKET_RELATED_DEFS[this.market].SYNCED_DE_RELATIONID_MAP[deName])
      })

      rule[pathName].criteria = criteria
    })

    this.decisionSplitRulesBySyncDe = rule
  }

  /**
   *
   */
  patchRule_TriggeredDe() {
    let rule = this.decisionSplitRulesByEntryDe

    // format:  Key=\"Event.SalesforceObjb7fcfb67d144ca052610e6d9ae7337bf.CampaignMember:Contact:et4ae5__HasOptedOutOfMobile__c\"
    // placeholder: _ENTRY_EVENT = Event.SalesforceObjb7fcfb67d144ca052610e6d9ae7337bf
    // placeholder: _ENTRY_OEJECT_ = CampaignMember

    let eventDefinitionKey = this.triggerEventDefinitionKey = _.get(this.srcJ, "triggers.0.metaData.eventDefinitionKey")
    if (!eventDefinitionKey) {
      console.info("Cannot resolve eventDefinitionKey from journey triggers.0.metaData.eventDefinitionKey")
    }

    let objectApiName = this.triggerObjectApiName =
      _.get(this.srcJ, "triggers.0.configurationArguments.objectApiName")
      || _.get(this.srcJ, "triggers.0.configurationArguments.objectAPIName")
    if (!objectApiName) {
      console.log(`_.get(this.srcJ, "triggers.0")`, _.get(this.srcJ, "triggers.0"))
      console.info("Cannot resolve objectApiName from journey triggers.0.configurationArguments.objectApiName")
    }

    let eventPlaceholder = `Event.${eventDefinitionKey}`

    // replace all the placeholders
    Object.keys(rule).forEach(pathName => {
      let criteria = rule[pathName].criteria

      criteria = criteria.replace(new RegExp(`_ENTRY_EVENT_`, 'g'), eventPlaceholder)
      criteria = criteria.replace(new RegExp(`_ENTRY_OEJECT_`, 'g'), objectApiName)

      // works for tw, hk contact objects
      criteria = criteria.replace(new RegExp(`\.Contact:Contact__r:`, 'g'), '.Contact:') // special case for Contact EntryObject

      // works for tw, hk camapgin member objects
      criteria = criteria.replace(new RegExp(`\.CampaignMember:Contact__r:`, 'g'), '.CampaignMember:Contact:')

      rule[pathName].criteria = criteria
    })

    this.decisionSplitRulesByEntryDe = rule
  }

  /**
   * Remove icons which added by this script
   */
  _cleanCriteriaPathName(pathName) {
    if (pathName) {
      pathName = pathName.replace(new RegExp(ICON_RULE_FROM_SYNC_DE, 'g'), "")
      pathName = pathName.replace(new RegExp(ICON_RULE_FROM_TRIGGERED_DE, 'g'), "")
    }

    return pathName
  }

  /**
   * Get the pre-defined criteria
   *
   * @param {string} pathName The criteria name
   * @param {object} options
   *     options.useEntryDataField {bool} Default False. To read data from Synced Data Extension or from entry data.
   */
  getCriteria(pathName, options) {
    let targetRules = this.decisionSplitRulesBySyncDe

    if (options.useEntryDataField) {
      if (!this.triggerEventDefinitionKey) {
        throw new Error("Use the triggered DE criteria while cannot resolve the eventDefinitionKey (triggers.0.metaData.eventDefinitionKey)")
      }
      if (!this.triggerObjectApiName) {
        throw new Error("Use the triggered DE criteria while cannot resolve the objectApiName (triggers.0.configurationArguments.objectApiName)")
      }

      targetRules = this.decisionSplitRulesByEntryDe
    }

    return targetRules[pathName + "_" + this.market.toUpperCase()] || targetRules[pathName]
  }


  /**
   * Generate the min and max waiting times for each activity.
   *
   * Usage:
   *
   * this.generateActivityWaitMap()
   *
   * let minWaitTime = this.resolveActivityMinWaitMinutesFromEntry(activityId)
   * let maxWaitTime = this.resolveActivityMinWaitMinutesFromEntry(activityId)
   */
  generateActivityWaitMap() {
    this.activityWaitMap = {}
    this._traverseWaitMap(0, 0, _.get(this.srcJ, 'activities.0'))
  }

  _traverseWaitMap(minMinutesBefore, maxMinutesBefore, activity) {
    if (!activity) { return }

    // save this node
    this.activityWaitMap[activity.id] = this.activityWaitMap[activity.id] || {} // init
    this.activityWaitMap[activity.id] = {
      min: Math.min(minMinutesBefore, this.activityWaitMap[activity.id].min || Number.MAX_SAFE_INTEGER),
      max: Math.max(maxMinutesBefore, this.activityWaitMap[activity.id].max || 0)
    }

    // calculate nodes
    if (_.get(activity, 'metaData.uiType') === "WAITBYDURATION") {
      let waitDuration = _.get(activity, 'configurationArguments.waitDuration')
      let waitUnit = _.get(activity, 'configurationArguments.waitUnit')

      if (waitUnit === "DAYS") {
        waitDuration *= 60 * 24
      } else if (waitUnit === "HOURS") {
        waitDuration *= 60
      }

      minMinutesBefore += waitDuration
      maxMinutesBefore += waitDuration
    } else if (_.get(activity, 'type') === "STOWAIT") {
      // Einstein STO
      let slidingWindowHours = _.get(activity, 'configurationArguments.params.slidingWindowHours', 0)
      maxMinutesBefore += slidingWindowHours * 60
    }

    // traverse outcomes
    let outcomes = _.get(activity, 'outcomes', {})
    for (let i = 0; i < outcomes.length; i++) {
      const anOutcome = outcomes[i];

      // find the outcome node
      let outcomeNode = this.srcJ.activities.find(act => {
        return act.key === anOutcome.next
      })

      if (outcomeNode) {
        // dive into this node
        this._traverseWaitMap(minMinutesBefore, maxMinutesBefore, outcomeNode)
      }
    }
  }

  /**
   * Resolve how many minutes before this activity since entry.
   *
   * @param {string} activityId ex c25e6915-5aa7-4466-b247-e9ee99160b00
   */
  resolveActivityMinWaitMinutesFromEntry(activityId) {
    return this.activityWaitMap[activityId].min || 0
  }
  resolveActivityMaxWaitMinutesFromEntry(activityId) {
    return this.activityWaitMap[activityId].max || 0
  }

  /**
   * Identify the source journey is from triggered source or from data extension
   * @returns bool
   */
  isSFObjectTriggered() {
    return _.get(this.srcJ, 'triggers.0.type') === "SalesforceObjectTriggerV2"
  }
  isAutomationTriggered() {
    return _.get(this.srcJ, 'triggers.0.type') === "AutomationAudience"
  }
  isJourneyScheduled() {
    return _.get(this.srcJ, 'triggers.0.type') === "EmailAudience"
  }

  patchJourney() {
    this.nextJ = _.pick(this.srcJ, ["activities", "triggers"])

    this.patchJourneyDecisionSplits()

    return this.nextJ
  }

  patchJourneyDecisionSplits() {
    let nextJ = this.nextJ
    logger.debug('Dealing with triggered entry journey? ' + this.isSFObjectTriggered())

    // patch decision splits
    for (let i = 0; i < nextJ.activities.length; i++) {
      const act = nextJ.activities[i];

      if (act.type === 'MULTICRITERIADECISION') {
        let minMinutesToThisActivity = this.resolveActivityMinWaitMinutesFromEntry(act.id)

        for (let j = 0; j < act.outcomes.length; j++) {
          const actOutcome = act.outcomes[j];
          let actOutcomeMetaDataLabel = actOutcome.metaData.label
          actOutcomeMetaDataLabel = this._cleanCriteriaPathName(actOutcomeMetaDataLabel) // clear icons

          let shouldUseEntryDe = this.isSFObjectTriggered() ? minMinutesToThisActivity < 60 : false
          let predefinedCriteria = this.getCriteria(actOutcomeMetaDataLabel, {
            useEntryDataField: shouldUseEntryDe
          })

          // try to use DE criteria if there's no such rule for triggered DE
          if (!predefinedCriteria) {
            shouldUseEntryDe = false
            predefinedCriteria = this.getCriteria(actOutcomeMetaDataLabel, {
              useEntryDataField: false
            })
          }

          // path the criteria
          if (predefinedCriteria) {
            let originalLabel = actOutcome.metaData.label
            let newLabel = (shouldUseEntryDe ? ICON_RULE_FROM_TRIGGERED_DE : ICON_RULE_FROM_SYNC_DE) + actOutcomeMetaDataLabel

            let originalDesc = nextJ.activities[i].outcomes[j].metaData.criteriaDescription
            let afterDesc = predefinedCriteria.description

            if (originalDesc !== afterDesc || originalLabel !== newLabel) {
              logger.info(`Replace ${actOutcome.metaData.label} to ${newLabel}`)
              logger.info(`\tbefore: ` + nextJ.activities[i].outcomes[j].metaData.criteriaDescription)
              logger.info(`\tafter : ` + predefinedCriteria.description)

              // start to update the criteria
              nextJ.activities[i].outcomes[j].metaData.label = newLabel
              nextJ.activities[i].outcomes[j].metaData.criteriaDescription = predefinedCriteria.description
              nextJ.activities[i].configurationArguments.criteria[actOutcome.key] = predefinedCriteria.criteria
            } else {
              logger.debug(`Skip ${originalLabel}`)
            }
          } else {
            // console.log(`Cannot find criteria for ${actOutcomeMetaDataLabel}`)
          }
        }
      }

      // add the wait time to the activity name
      let minWaitMinus = this.resolveActivityMinWaitMinutesFromEntry(act.id)
      let maxWaitMinus = this.resolveActivityMaxWaitMinutesFromEntry(act.id)
      // nextJ.activities[i].name = `(${minWaitMinus}~${maxWaitMinus}m)`+nextJ.activities[i].name // add the debug time strings
      nextJ.activities[i].name = nextJ.activities[i].name.replace(/\(\d+~\d+m\)/g, "") // remove the debug time strings
    }

    this.nextJ = nextJ
  }

  patchJourneyWaitTimeToMinute() {
    let nextJ = this.nextJ

    // patch decision splits
    for (let i = 0; i < nextJ.activities.length; i++) {
      const act = nextJ.activities[i];

      if (act.type === 'WAIT' && act.metaData.uiType === "WAITBYDURATION") {
        nextJ.activities[i].configurationArguments.waitUnit = "MINUTES"
        logger.debug(`Replace ${act.key} from ${act.name} to ${act.configurationArguments.waitDuration} ${nextJ.activities[i].configurationArguments.waitUnit}`)
      }
    }

    this.nextJ = nextJ
  }

  /**
   * For name=CREATE_CONTACTJOURNEY & type=SALESCLOUDACTIVITY(Object Activity)
   *
   * Upadte to
   *   * Contact: Assign to the Person in the Journey
   *   * Journey_Name__c: The current Journey Name
   *   * Journey_Start_Date__c: Date Contact Enters Activity
   *   * Ready_for_Journey__c: true
   *
   *
   * Usage:
   * 1. Add a SalesCloudActivity Stage in Journey Builder.
   * 2. Rename the activity to CREATE_CONTACTJOURNEY. (No need to update the content)
   * 3. Run the update script/
   */
  patchCreateContactJourneyActivity() {
    let nextJ = this.nextJ

    // patch decision splits
    for (let i = 0; i < nextJ.activities.length; i++) {
      const act = nextJ.activities[i];

      if (act.name.indexOf(`CREATE_CONTACTJOURNEY`) >= 0) {
        logger.debug(`Updating ${act.name} (${act.key})`)

        // Generate Existing Field Maps
        let existingFieldNameToFieldValueMap = {}
        let existingObjectMapObjects = _.get(act, 'arguments.objectMap.objects', [])
        existingObjectMapObjects.forEach(row => {
          existingFieldNameToFieldValueMap[row.FieldName] = row.FieldValue
        })

        _.set(nextJ.activities[i], 'name', `${ICON_RULE_FROM_SYNC_DE}CREATE_CONTACTJOURNEY`)
        _.set(nextJ.activities[i], 'schema.arguments', {
          "SalesforceObjectID": {
            "access": "Visible",
            "dataType": "Text",
            "direction": "Out",
            "isNullable": true
          }
        })
        _.set(nextJ.activities[i], 'metaData', {
          "isConfigured": true,
          "expressionBuilderPrefix": "Contact Journey"
        })
        _.set(nextJ.activities[i], 'arguments.version', "1.0")
        _.set(nextJ.activities[i], 'arguments.objectMap.objects', [{
          "type": "coe__Contact_Audience__c",
          "subtype": null,
          "order": "1",
          "action": "Create",
          "lookup": null,
          "fields": [
            {
              "FieldName": "coe__Contact__c",
              "FieldLabel": "Contact",
              "FieldValue": "Assign to the Person in the Journey",
              "FieldValueLabel": "Assign to the Person in the Journey",
              "Required": "true",
              "FieldType": "reference",
              "MappingType": "Constant",
              "Processor": "personInJourney",
              "ReferenceObjectNames": [
                "CONTACT"
              ]
            },
            {
              "FieldName": "Journey_Name__c",
              "FieldLabel": "Journey Name",
              "FieldValue": this.srcJ.name,
              "FieldValueLabel": this.srcJ.name,
              "Required": "false",
              "FieldType": "string",
              "MappingType": "Constant",
              "Processor": "static"
            },
            {
              "FieldName": "Journey_Start_Date__c",
              "FieldLabel": "Journey Start Date",
              "FieldValue": "Date Contact Enters Activity",
              "FieldValueLabel": "Date Contact Enters Activity",
              "Required": "false",
              "FieldType": "datetime",
              "MappingType": "Constant",
              "Processor": "dateContactEnters",
              "FieldAdjustment": {
                "SubProcessor": "dateAdjustment",
                "Units": "Days",
                "NumUnits": "0",
                "TimeDirection": "after"
              }
            },
            {
              "FieldName": "Ready_for_Journey__c",
              "FieldLabel": "Ready for Journey",
              "FieldValue": "true",
              "FieldValueLabel": "true",
              "Required": "false",
              "FieldType": "boolean",
              "MappingType": "Constant",
              "Processor": "static"
            }
          ]
        }])

        logger.debug(` - Journey_Name__c: ${this.srcJ.name}`)
      }
    }

    return this.nextJ = nextJ
  }

  /**
  * For name=END_CONTACTJOURNEY & type=SALESCLOUDACTIVITY(Object Activity)
  *
  * Upadte to
  *   * Contact: Assign to the Person in the Journey
  *   * Journey_Name__c: The current Journey Name
  *   * Journey_Start_Date__c: Date Contact Enters Activity
  *   * Ready_for_Journey__c: true
  *
  * Usage:
  * 1. Add a SalesCloudActivity Stage in Journey Builder.
  * 2. Rename the activity to END_CONTACTJOURNEY. (No need to update the content)
  * 3. Run the update script/
   */
  patchEndContactJourneyActivity() {
    let nextJ = this.nextJ

    // find the target ContactJourney Object to update
    let firstContactJourneyObject = this._findFirstContactJourneyCreateOrUpdateActivity() // note firstContactJourneyObject could be null

    for (let i = 0; i < nextJ.activities.length; i++) {
      const act = nextJ.activities[i];

      if (act.name.indexOf(`END_CONTACTJOURNEY`) >= 0) {
        if (!firstContactJourneyObject) {
          throw new Error("Cannot find the first ContactJourney Create Or Update Object activities")
        }

        logger.debug(`Updating ${act.name} (${act.key})`)

        // Generate for Contact Journeys
        let fields = [{
          "UpdateType": "OverWriteNewValue",
          "Updateable": "true",
          "FieldName": "Journey_End_Date__c",
          "FieldLabel": "Journey End Date",
          "FieldValue": "Date Contact Enters Activity",
          "FieldValueLabel": "Date Contact Enters Activity",
          "Required": "false",
          "FieldType": "datetime",
          "MappingType": "Constant",
          "Processor": "dateContactEnters",
          "FieldAdjustment": {
            "SubProcessor": "dateAdjustment",
            "Units": "Days",
            "NumUnits": "0",
            "TimeDirection": "after"
          }
        }]

        // handle generated cases
        let firstPrecedingCaseActivity = this._findFirstPrecedingCaseActivity(act.key)
        if (firstPrecedingCaseActivity) {
          fields.push({
            "UpdateType": "OverWriteNewValue",
            "Updateable": "true",
            "FieldName": "Journey_Outcome_Case__c",
            "FieldLabel": "Journey Outcome Case",
            "FieldValue": `{{Interaction.${firstPrecedingCaseActivity.key}.salesforceObjectID}}`,
            "FieldValueLabel": "salesforceObjectID",
            "Required": "false",
            "FieldType": "reference",
            "MappingType": "Constant",
            "Processor": "static",
            "ReferenceObjectNames": [
              "CASE"
            ]
          })

          logger.debug(` - Journey_Outcome_Case__c: ${_.last(fields).FieldValue}`)
        }

        // handle exit reason
        let { decisionSplitActivity, decisionSplitOutcome } = this._findFirstPrecedingDecisionActivity(act.key)
        if (decisionSplitOutcome) {
          fields.push({
            "UpdateType": "OverWriteNewValue",
            "Updateable": "true",
            "FieldName": "Journey_Exit_Reason__c",
            "FieldLabel": "Journey Exit Reason",
            "FieldValue": decisionSplitOutcome.metaData.label,
            "FieldValueLabel": decisionSplitOutcome.metaData.label,
            "Required": "false",
            "FieldType": "string",
            "MappingType": "Constant",
            "Processor": "static"
          })
          logger.debug(` - Journey_Exit_Reason__c: ${_.last(fields).FieldValue}`)
        }

        // resolve the new activity name
        let activityName = `${ICON_RULE_FROM_SYNC_DE}END_CONTACTJOURNEY`
        if (decisionSplitOutcome) {
          let subfix = decisionSplitOutcome.metaData.label
          subfix = subfix.replace(ICON_RULE_FROM_SYNC_DE, '')
          subfix = subfix.replace(ICON_RULE_FROM_TRIGGERED_DE, '')
          activityName = `${activityName}(${subfix})`
        }
        _.set(nextJ.activities[i], 'name', activityName)
        logger.debug(` - Rename to: ${activityName}`)

        _.set(nextJ.activities[i], 'schema.arguments', {
          "SalesforceObjectID": {
            "access": "Visible",
            "dataType": "Text",
            "direction": "Out",
            "isNullable": true
          }
        })
        _.set(nextJ.activities[i], 'metaData', {
          "isConfigured": true,
          "expressionBuilderPrefix": "Contact Journey"
        })
        _.set(nextJ.activities[i], 'arguments.version', "1.0")
        _.set(nextJ.activities[i], 'arguments.objectMap.objects', [{
          "type": "coe__Contact_Audience__c",
          "subtype": null,
          "order": "1",
          "action": "Update",
          "lookup": {
            "type": "salesforceLookup",
            "lookupObject": "coe__Contact_Audience__c",
            "steps": [
              {
                "criteria": [
                  {
                    "FieldName": "Id",
                    "FieldValue": `{{Interaction.${firstContactJourneyObject.key}.salesforceObjectID}}`,
                    "FieldValueLabel": firstContactJourneyObject.name,
                    "FieldType": "id"
                  }
                ]
              }
            ],
            "MultiOutComeOption": "DoNotUpdate",
            "ZeroOutComeOption": "DoNotUpdate"
          },
          "fields": fields
        }])
      }
    }

    return this.nextJ = nextJ
  }

  /**
   * Find the first contact_audience object creation in the journey.
   * @returns Object activity or null if not found
   */
  _findFirstContactJourneyCreateOrUpdateActivity() {
    for (let i = 0; i < this.nextJ.activities.length; i++) {
      const act = this.nextJ.activities[i];
      if (act.type === "SALESCLOUDACTIVITY" && act.name.indexOf("CREATE_CONTACTJOURNEY") >= 0) {
        return act
      }
    }

    return null
  }

  /**
   * Finds the nearest preceding activity that leads to the given activity key (actKey).
   *
   * @param {string} actKey - The key of the activity for which to find the preceding activity.
   * @returns {activity | null}
   */
  _findFirstPrecedingCaseActivity(actKey) {
    // find the preceding activity which outcome to the given actKey
    let precedingAct = this.nextJ.activities.find((anAct, idx) => {
      return _.get(anAct, 'outcomes', []).find(anOutcome => {
        return anOutcome.next === actKey
      })
    })

    if (precedingAct === undefined) {
      return null
    } else if (precedingAct.metaData.expressionBuilderPrefix === "Case") {
      return precedingAct
    } else { // find futhur Preceding
      return this._findFirstPrecedingCaseActivity(precedingAct.key)
    }
  }

  /**
   * Finds the nearest preceding activity that leads to the given activity key (actKey).
   *
   * @param {string} actKey - The key of the activity for which to find the preceding activity.
   * @returns {Object | null} {decisionSplitActivity, decisionSplitOutcome}
   */
  _findFirstPrecedingDecisionActivity(actKey) {
    // find the preceding activity which outcome to the given actKey
    let precedingAct = this.nextJ.activities.find((anAct, idx) => {
      return _.get(anAct, 'outcomes', []).find(anOutcome => {
        return anOutcome.next === actKey
      })
    })

    // find the target outcome
    let theOutcome = precedingAct?.outcomes.find(anOutcome => {
      return anOutcome.next === actKey
    })

    if (precedingAct === undefined) {
      return { decisionSplitActivity: null, decisionSplitOutcome: null } // return empty
    } else if (precedingAct.type === "MULTICRITERIADECISION") {
      return { decisionSplitActivity: precedingAct, decisionSplitOutcome: theOutcome }
    } else { // find futhur Preceding
      return this._findFirstPrecedingDecisionActivity(precedingAct.key)
    }
  }

}

module.exports = JourneyBuilder