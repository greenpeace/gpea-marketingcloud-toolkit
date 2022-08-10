const axios = require('axios');
const logger = require('../../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')

const {
  MARKET_RELATED_DEFS, 
  DECISION_SPLIT_RULES_BY_SYNC_DE,
  DECISION_SPLIT_RULES_BY_ENTRY_DE} = require('./DecisionSplitCriteria.js')



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
  async loadSrcJourneyName (jName) {
    // find the source journey
    // let r = await mcJourney.findByName('up-test-de_entry-20220706-src')
    let mcJourney = this.parent.factory('Journey')
    let r = await mcJourney.findByName(jName, {mostRecentVersionOnly: true})
    let srcJ = this.srcJ = _.get(r, 'items.0', null)

    if (!srcJ) {
      throw new Error("Cannot find the source journey")
    }

    // resolve market
    return this.srcJ
  }

  setMarket (market) {
    market = market.toLowerCase()
    
    if (["tw","hk","kr"].indexOf(market)<0) {
      throw new Error("The market should be one of tw, hk or kr")
    }

    this.market = market
    return this.market
  }

  pathDecisionSplitCriteria () {
    if ( !this.market) { throw new Error("You must setMarket before using this function.") }

    this.patchRule_UIMETADATA()
    this.patchRule_DeRelationIds()

    if (this.isSFObjectTriggered()) {
      this.patchRule_TriggeredDe()  
    }
  }

  patchRule_UIMETADATA () {
    let rule = this.decisionSplitRulesBySyncDe

    // replace all the placeholders
    Object.keys(rule).forEach(pathName => {
      rule[pathName].criteria = 
        rule[pathName].criteria.replace(new RegExp(`_UI_METADATA_`, 'g'), MARKET_RELATED_DEFS[this.market].UI_METADATA)
    })

    this.decisionSplitRulesBySyncDe = rule
  }

  patchRule_DeRelationIds () {
    let rule = this.decisionSplitRulesBySyncDe

    // replace all the placeholders
    Object.keys(rule).forEach(pathName => {
      let criteria = rule[pathName].criteria

      // replace the relation ids
      Object.keys(MARKET_RELATED_DEFS[this.market].SYNCED_DE_RELATIONID_MAP).forEach (deName => {
        criteria = criteria.replace(new RegExp(`_${deName}_`, 'g'), 
          MARKET_RELATED_DEFS[this.market].SYNCED_DE_RELATIONID_MAP[deName])
      })

      rule[pathName].criteria = criteria
    })

    this.decisionSplitRulesBySyncDe = rule
  }

  patchRule_TriggeredDe () {
    let rule = this.decisionSplitRulesByEntryDe

    // format:  Key=\"Event.SalesforceObjb7fcfb67d144ca052610e6d9ae7337bf.CampaignMember:Contact:et4ae5__HasOptedOutOfMobile__c\"
    // placeholder: _ENTRY_EVENT = Event.SalesforceObjb7fcfb67d144ca052610e6d9ae7337bf
    // placeholder: _ENTRY_OEJECT_ = CampaignMember

    let eventDefinitionKey = this.triggerEventDefinitionKey = _.get(this.srcJ, "triggers.0.metaData.eventDefinitionKey")
    if ( !eventDefinitionKey) {
      console.info("Cannot resolve eventDefinitionKey from journey triggers.0.metaData.eventDefinitionKey")
    }

    let objectApiName = this.triggerObjectApiName = _.get(this.srcJ, "triggers.0.configurationArguments.objectApiName")
    if ( !objectApiName) {
      console.log(`_.get(this.srcJ, "triggers.0")`, _.get(this.srcJ, "triggers.0"))
      console.info("Cannot resolve objectApiName from journey triggers.0.configurationArguments.objectApiName")
    }

    let eventPlaceholder = `Event.${eventDefinitionKey}`

    // replace all the placeholders
    Object.keys(rule).forEach(pathName => {
      let criteria = rule[pathName].criteria

      criteria = criteria.replace(new RegExp(`_ENTRY_EVENT_`, 'g'), eventPlaceholder)
      criteria = criteria.replace(new RegExp(`_ENTRY_OEJECT_`, 'g'), objectApiName)
    
      rule[pathName].criteria = criteria
    })

    this.decisionSplitRulesByEntryDe = rule
  }

  /**
   * Remove icons which added by this script
   */
  _cleanCriteriaPathName (pathName) {
    pathName = pathName.replace(new RegExp(ICON_RULE_FROM_SYNC_DE, 'g'), "")
    pathName = pathName.replace(new RegExp(ICON_RULE_FROM_TRIGGERED_DE, 'g'), "")

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
      if ( !this.triggerEventDefinitionKey) {
        throw new Error("Use the triggered DE criteria while cannot resolve the eventDefinitionKey (triggers.0.metaData.eventDefinitionKey)")
      }
      if ( !this.triggerObjectApiName) {
        throw new Error("Use the triggered DE criteria while cannot resolve the objectApiName (triggers.0.configurationArguments.objectApiName)")
      }

      targetRules = this.decisionSplitRulesByEntryDe
    }

    return targetRules[pathName+"_"+this.market.toUpperCase()] || targetRules[pathName]
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
  generateActivityWaitMap () {
    this.activityWaitMap = {}
    this._traverseWaitMap(0, 0, _.get(this.srcJ, 'activities.0'))
  }

  _traverseWaitMap (minMinutesBefore, maxMinutesBefore, activity) {
    if ( !activity) { return }

    // save this node
    this.activityWaitMap[activity.id] = this.activityWaitMap[activity.id] || {} // init
    this.activityWaitMap[activity.id] = {
      min: Math.min(minMinutesBefore, this.activityWaitMap[activity.id].min || Number.MAX_SAFE_INTEGER),
      max: Math.max(maxMinutesBefore, this.activityWaitMap[activity.id].max || 0)
    }

    // calculate nodes
    if (_.get(activity, 'metaData.uiType')==="WAITBYDURATION") {
      let waitDuration = _.get(activity, 'configurationArguments.waitDuration')
      let waitUnit = _.get(activity, 'configurationArguments.waitUnit')

      if (waitUnit==="DAYS") {
        waitDuration *= 60*24
      } else if (waitUnit==="HOURS") {
        waitDuration *= 60
      }

      minMinutesBefore += waitDuration
      maxMinutesBefore += waitDuration
    } else if (_.get(activity, 'type')==="STOWAIT") {
      // Einstein STO
      let slidingWindowHours = _.get(activity, 'configurationArguments.params.slidingWindowHours', 0)
      maxMinutesBefore += slidingWindowHours*60
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
  resolveActivityMinWaitMinutesFromEntry (activityId) {
    return this.activityWaitMap[activityId].min || 0
  }
  resolveActivityMaxWaitMinutesFromEntry (activityId) {
    return this.activityWaitMap[activityId].max || 0
  }

  /**
   * Identify the source journey is from triggered source or from data extension
   * @returns bool
   */
  isSFObjectTriggered() {
    return _.get(this.srcJ, 'triggers.0.type')==="SalesforceObjectTriggerV2"
  }

  pathJourney () {
    this.nextJ = _.pick(this.srcJ, ["activities", "triggers"])

    this.patchJourneyDecisionSplits()

    return this.nextJ
  }

  patchJourneyDecisionSplits () {
    let nextJ = this.nextJ
    logger.debug('Dealing with triggered entry journey? '+this.isSFObjectTriggered())

    // patch decision splits
    for (let i = 0; i < nextJ.activities.length; i++) {
      const act = nextJ.activities[i];
      
      if (act.type==='MULTICRITERIADECISION') {
        let minMinutesToThisActivity = this.resolveActivityMinWaitMinutesFromEntry(act.id)

        for (let j = 0; j < act.outcomes.length; j++) {
          const actOutcome = act.outcomes[j];
          let actOutcomeMetaDataLabel = actOutcome.metaData.label
          actOutcomeMetaDataLabel = this._cleanCriteriaPathName(actOutcomeMetaDataLabel) // clear icons

          let shouldUseEntryDe = this.isSFObjectTriggered() ? minMinutesToThisActivity<60 : false
          let predefinedCriteria = this.getCriteria(actOutcomeMetaDataLabel, {
            useEntryDataField: shouldUseEntryDe
          })

          // try to use DE criteria if there's no such rule for triggered DE
          if ( !predefinedCriteria) {
            shouldUseEntryDe = false
            predefinedCriteria = this.getCriteria(actOutcomeMetaDataLabel, {
              useEntryDataField: false
            })
          }

          // path the criteria
          if (predefinedCriteria) {
            let originalLabel = actOutcome.metaData.label
            let newLabel = (shouldUseEntryDe?ICON_RULE_FROM_TRIGGERED_DE:ICON_RULE_FROM_SYNC_DE)+actOutcomeMetaDataLabel
            
            let originalDesc = nextJ.activities[i].outcomes[j].metaData.criteriaDescription
            let afterDesc = predefinedCriteria.description

            if (originalDesc !== afterDesc || originalLabel!==newLabel) {
              logger.info(`Replace ${actOutcome.metaData.label} to ${newLabel}`)
              logger.info(`\tbefore: `+nextJ.activities[i].outcomes[j].metaData.criteriaDescription)
              logger.info(`\tafter : `+predefinedCriteria.description)
  
              // start to update the criteria
              nextJ.activities[i].outcomes[j].metaData.label = newLabel
              nextJ.activities[i].outcomes[j].metaData.criteriaDescription = predefinedCriteria.description
              nextJ.activities[i].configurationArguments.criteria[actOutcome.key] = predefinedCriteria.criteria 
            } else {
              logger.debug(`Skip ${originalLabel}`)
            }
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
}

module.exports = JourneyBuilder