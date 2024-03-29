const axios = require('axios');
const logger = require('../../lib/logger');
const fs = require('fs');
const _ = require("lodash")
const { format, subDays, sub, parse, add } = require('date-fns');

class Journey {
  constructor(options) {
    this.parent = null
  }

  /**
   * Retriebe the full journey list
   * @return {array}
   */
  async getAll() {
    let page = 1
    let items = []

    while (true) {
      let url = `${this.parent.restEndpoint}/interaction/v1/interactions?$page=${page}`
      let response = await axios.get(url, {
        headers: { "authorization": `Bearer ${this.parent.accessToken}` }
      })

      // concate the found journeys
      let data = response.data
      items = items.concat(data.items)
      logger.debug(`Fetched ${data.items.length} journeys for page ${page}`)

      // determine should we run next
      if (data.page * data.pageSize >= data.count) {
        break
      } else if (page >= 50) {
        break // to prevent anything wrong to fallinto infinite loops
      } else {
        page += 1
      }
    }

    logger.debug(`found ${items.length} journeys`)
    return items
  }

  /**
   * Fetch the journey details.
   *
   * @param {string} journeyId THe GUID style journeyId.
   * @return {object}
   *  {
   *   count: 1,
   *   page: 1,
   *   pageSize: 50,
   *   links: {},
   *   summary: {
   *     totalInteractions: 128,
   *     totalRunningVersionsWithDefinedGoal: 1,
   *     totalRunningVersionsMeetingGoal: 1,
   *     cumulativePopulation: 2367130
   *   },
   *   items: [
   *     {
   *       id: '622caa5c-d493-4d42-9623-f1b317fddc04',
   *       key: 'c91c140d-318e-5ad3-f195-9a392b763a05',
   *       name: 'hk-reactivation-automd-lapsed_donors',
   *       lastPublishedDate: '2021-09-07T03:58:29',
   *       description: '',
   *       version: 14,
   *       workflowApiVersion: 1,
   *       createdDate: '2021-09-07T03:49:56.13',
   *       modifiedDate: '2021-09-07T03:58:29.967',
   *       activities: [Array],
   *       triggers: [
   *         {metaData: {eventDefinitionId}}
   *       ],
   *       goals: [],
   *       exits: [],
   *       notifiers: [],
   *       stats: [Object],
   *       healthStats: {
   *          currentlyInCount,
   *       },
   *       tags: [Array],
   *       entryMode: 'SingleEntryAcrossAllVersions',
   *       definitionType: 'Multistep',
   *       channel: '',
   *       defaults: [Object],
   *       metaData: [Object],
   *       executionMode: 'Production',
   *       categoryId: 1045,
   *       status: 'Published',
   *       definitionId: '6a6d1ca2-877b-441c-986f-9f6ea383a107',
   *       scheduledStatus: 'Draft'
   *     }
   *   ]
   * }
   */
  async findById(journeyId) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions?id=${journeyId}&mostRecentVersionOnly=true&extras=all`
    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  /**
   * Find the journey which partialy matches the given names
   *
   * @param {string} journeyName
   * @param {dict} options
   *     options.mostRecentVersionOnly bool
   *     options.fuzzyMatch bool Default False. To search with `%journeyName%`
   * @returns
   */
  async findByName(journeyName, options = {}) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions?name=${journeyName}&mostRecentVersionOnly=${options.mostRecentVersionOnly ? 'true' : 'false'}&extras=all`
    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    // exactly match, remove the partial match items
    if (!options.fuzzyMatch && response.data.items.length > 1) {
      response.data.items = response.data.items.filter(j => {
        return j.name === journeyName
      })
    }

    return response.data
  }

  async findByKey(journeyKey) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/key:${journeyKey}`
    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  /**
   * Retrieve the Contacts Evaluated and Contacts Accepted for
   * entring into the Journey in last 30 days
   *
   * @param {string} eventDefinitionId The trigger eventId.You can find it at journey response: j["items"][0]["triggers"][0]["metaData"]["eventDefinitionId"]
   * @return Array
   * [
   *   { "eventType": "MetCriteria", "category": "success", "count": 9518 }, # Contacts Evaluated
   *   { "eventType": "ContactAttempted", "category": "information", "count": 9518 }, # Contacts Accepted
   *   { "eventType": "Failed", "category": "failure", "count": 5 }, # Rejected Contacts
   *   { "eventType": "ContactsWaiting", "category": "information", "count": 2861 } # People In Data Extension
   * ]
   *
   */
  async getTriggerstats(eventDefinitionId) {
    let url = `${this.parent.restEndpoint}/interaction/v1/triggerstats/${eventDefinitionId}`
    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data.statuses
  }

  /**
   * A helper function to quickly get the number contacts for journeys
   *
   * @param {string} journeyName The full journey name to find
   * @returns { cumulativePopulation, numContactsCurrentlyInJourney, numContactsAcceptedIn30Days}
   */
  async getJourneyStatByName(journeyName) {
    // search the journey by name
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions?name=${journeyName}&mostRecentVersionOnly=true&extras=all`
    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    let foundJourney = response.data.items.find(j => j.name === journeyName)

    if (!foundJourney) {
      throw new Error(`Cannot find the given journey by name ${journeyName}`)
    } else {
      logger.debug(`Found journey with name ${journeyName}`)
    }

    // get numContactsCurrentlyInJourney
    let cumulativePopulation = _.get(foundJourney, "stats.cumulativePopulation", 0)
    let numContactsCurrentlyInJourney = _.get(foundJourney, "healthStats.currentlyInCount", 0)

    // get numContactsAcceptedIn30Days in 30 days
    let eventDefId = _.get(foundJourney, "triggers.0.metaData.eventDefinitionId")
    let triggerstats = await this.getTriggerstats(eventDefId)
    let metCriteriaSuccessRow = triggerstats.find(row => row.eventType === 'MetCriteria' && row.category === 'success')
    let numContactsAcceptedIn30Days = metCriteriaSuccessRow ? metCriteriaSuccessRow.count : 0

    return {
      cumulativePopulation,
      numContactsCurrentlyInJourney,
      numContactsAcceptedIn30Days,
      journey: foundJourney
    }
  }

  /**
   * To pause a journey
   *
   * Usage:
   *   res = await this.pause(journeyId, {
    ExtendWaitEndDates: true,
    PausedDays: 14,
    GuardrailAction: "Stop",
    RetainContactInjectionWhileJourneyPaused: true,
    AllVersions: true
  })
   *
   *
   * @param {UIUD} journeyId The journey journeyId UUID string (The ID on the URL)
   * @param {dict} options @see Offical Document https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-apis.meta/mc-apis/JourneyPauseByDefinitionId.htm
   * @returns
   */
  async pause(journeyId, options) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/pause/${journeyId}`

    // add the version.
    if (options.versionNumber) {
      url += `?VersionNumber=${options.versionNumber}`
    } else {
      url += `?AllVersions=true`
    }

    let response = await axios.post(url, options, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  /**
   * To resume a paused journey
   *
   * @param {string} journeyId The journey GUID which show on the URL
   * @param {*} options @see https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-apis.meta/mc-apis/JourneyResumeByDefinitionId.htm
   * @returns
   */
  async resume(journeyId, options = {}) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/resume/${journeyId}`

    // add the version.
    if (options.versionNumber) {
      url += `?VersionNumber=${options.versionNumber}`
    } else {
      url += `?AllVersions=true`
    }

    let response = await axios.post(url, options, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  async ejectContact(journeyCustomerKey, contactKey) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/contactexit`

    let response = await axios.post(url, [{
      "ContactKey": contactKey,
      "DefinitionKey": journeyCustomerKey
    }], {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }

  /**
    * To stop a paused journey
    *
    * @param {string} journeyId The journey GUID which show on the URL
    * @param {*} options @see https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-apis.meta/mc-apis/JourneyResumeByDefinitionId.htm
    *  options.versionNumber is required.
    * @returns
    */
  async stop(journeyId, options = {}) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/stop/${journeyId}`

    // add the version.
    if (options.versionNumber) {
      url += `?VersionNumber=${options.versionNumber}`
    } else {
      url += `?AllVersions=true`
    }

    let response = await axios.post(url, options, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  async ejectContact(journeyCustomerKey, contactKey) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/contactexit`

    let response = await axios.post(url, [{
      "ContactKey": contactKey,
      "DefinitionKey": journeyCustomerKey
    }], {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }

  /**
   * Find contacts is in which journeys.
   *
   * @see https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/contactMembershipRequest.html
   * @param {array} contactKeys
   * @returns {Object}
   */
  async contactInWhichJourneys(contactKeys) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/contactMembership`

    let response = await axios.post(url, {
      "ContactKeyList": contactKeys
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }

  async getJourneyErrorHistory(inDays = 1) {
    let findAfterDate = subDays(new Date(), inDays);

    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/journeyhistory/search?$page=1&$pageSize=1000`
    let response = await axios.post(url, {
      "start": format(findAfterDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
      "end": null,
      "statuses": [
        "Failed",
        "Unknown",
        "ErrorProcessingWaitActivity",
        "ErrorOccuredInProcessing",
        "ErrorValidatingContact",
        "WaitActivityAlreadyProcessed",
        "CouldNotParseInteractionId",
        "InteractionNotPublished",
        "NotEvaluatingEntryCriteria",
        "ErrorDeterminingInitialActivity",
        "InvalidInteractionId",
        "DidNotMeetEntryCriteria",
        "ContactNotFound",
        // "CurrentlyWaitingInSameInteraction",
        "ContactAlreadyInInteraction",
        "ContactPreviouslyInSameInteraction",
        "ContactObjectNull",
        "ContactIsDeleted",
        "ContactIsRestricted"
      ]
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }

  async getJourneyWarnHistory(inDays = 1) {
    let findAfterDate = subDays(new Date(), inDays);

    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/journeyhistory/search?$page=1&$pageSize=1000`
    let response = await axios.post(url, {
      "start": format(findAfterDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
      "end": null,
      "clientStatuses": [
        "Warning"
      ]
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }


  /**
   * Get the contact in journey status. ex, entered? completed?
   *
   * @param {string} journeyDefinitionId
   * @param {string} contactKey
   * @returns
   */
  async getContactJourneyStatus(journeyDefinitionId, contactKey) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/journeyhistory/contactkey?$page=1&$pageSize=1000`
    let response = await axios.post(url, {
      "definitionIds": [journeyDefinitionId],
      "queryString": `${contactKey}*`
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return _.get(response.data, 'items.0')
  }

  /**
   * To update the journey
   *
   * @param {*} journeyDetails
   * @returns
   */
  async updateJourney(journeyDetails) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions`

    let response = await axios.put(url, journeyDetails, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length > 0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }

  /**
   * Find the journey trigger event definitions.
   *
   * @param {string} jName Journey Name
   * @returns object
   */
  async getJourneyEventDefinitionsByJourneyName(jName) {
    let r = await this.findByName(jName, {mostRecentVersionOnly: true})
    let j = _.get(r, 'items.0', null)

    if (!j) {
      throw new Error("Cannot find the journey with name: " + j)
    }

    let triggerEventDefId = _.get(j, 'triggers.0.metaData.eventDefinitionId', null)
    if (!triggerEventDefId) {
      throw new Error("Cannot find the eventId from journey " + jName)
    }

    let def = await this.getEventDefinitions(triggerEventDefId)

    return def
  }

  /**
   * Get the journey entry event definitions
   *
   * @param {string} eventDefId ex. 67e6d2d0-b102-4ba9-9b8c-cd14e7c2cbc6
   * @returns dict
   */
  async getEventDefinitions(eventDefId) {
    let url = `${this.parent.restEndpoint}/interaction/v1/eventDefinitions/${eventDefId}`

    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    return response.data
  }

  /**
   * Get Journey history by filtering the Definition ID via API
   *
   * @see https://sfmarketing.cloud/2019/11/27/get-journey-history-by-filtering-the-definition-id-via-api/
   * @param {string} journeyName
   * @param {Date} start
   * @param {Date} end
   * @param {string} extras "all"
   */
  async getJourneyHistory(journeyName, { start, end, extras } = {}) {
    start = start ? start : sub(new Date(), { days: 30 });
    end = end ? end : (new Date())
    extras = extras || "all"

    logger.debug(`Fetching ${journeyName} definition Ids`)
    let r = await this.findByName(journeyName)
    let jDefIds = r.items
      .filter((aJourneyDef, idx) => {
        return aJourneyDef.name === journeyName
      })
      .map((aJourneyDef, idx) => {
        return aJourneyDef.definitionId
      })


    // Loop through each day between the start and end dates
    let setpHours = 24
    let histories = []
    let currentDate = start;
    let nextDate = Math.min(add(currentDate, { hours: setpHours }), end);
    while (currentDate < end) {
      logger.debug(`Fetching ${journeyName} history ${format(currentDate, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")}-${format(nextDate, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")} ...`)
      r = await this._getJourneyErrorHistory(jDefIds, currentDate, nextDate)

      if (r.items) {
        histories = histories.concat(r.items)

        if (r.items.length === 10000) {
          logger.warn('The journey may contains more rows. But maximum 10000 rows retrieved.')
        }
      }
      logger.debug(`Found ${r.count} items.`)

      // prepare next loop
      currentDate = add(nextDate, { seconds: 1 });
      nextDate = add(currentDate, { hours: setpHours });
    }

    return histories
  }

  /**
   * Fetch journey history which max contains 10000 records
   *
   * @param {array} journeyDefIds  required
   * @param {Date} start required
   * @param {Date} end required
   * @returns
   */
  async _getJourneyErrorHistory(journeyDefIds, start, end) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/journeyhistory/search?$page=1&$pageSize=10000&%24orderBy=TransactionTime%20desc`
    let response = await axios.post(url,
      {
        "definitionIds": journeyDefIds,
        "start": format(start, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
        "end": format(end, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
        "extras": "all"
      },
      {
        headers: { "authorization": `Bearer ${this.parent.accessToken}` }
      })

    return response.data
  }

  /**
   *
   * @param {array} recipients
   * @param {options.subjectFunc} function(emailActivity) Resolve the email subject.
   */
  async sendEmailPreviews(journeyName, recipients, { subjectPrefixFunc, targetContactId }={}) {
    // find the trigger DE Name
    logger.debug(`Resolving [${journeyName}] definitions …`)
    let eventDef = await this.getJourneyEventDefinitionsByJourneyName(journeyName)
    let deName = _.get(eventDef, 'dataExtensionName', null)

    // resolve the original de
    let mcDE = this.parent.factory('DataExtension')
    let de = await mcDE.findDeBy({ field: "Name", value: deName })
    let deId = de.ObjectID
    let deCustomerKey = de.CustomerKey

    // fetch rows
    logger.debug(`Fetching DE rows [${deName}], deId: ${deId} …`)
    let r = await mcDE.fetchDeRows(deName)
    logger.debug(`Found ${r.length} rows`)

    if (r.length===0) {
      logger.info(`Send 0 emails due to empty data extension`)
      return
    }

    // random show some candidate rows
    let sampleSize = 3
    let sampleRows = _.sampleSize(r, sampleSize)

    // manually assign the ContactId to preview
    if (targetContactId) {
      let foundContactRow = r.find(row => row.some(pair => pair.Name === "Id" && pair.Value === targetContactId))
      if (foundContactRow) {
        sampleRows = [foundContactRow]
      } else {
        throw new Error(`Cannot find row with ContactId ${targetContactId}`)
      }
    }

    // resolve using which row to preview
    // logger.debug(`Sample ${sampleSize.length} rows:`)
    // logger.debug(sampleRows)
    let previewRow = _.sample(sampleRows)  // [{ Name: '_CustomObjectKey', Value: '39681' }, ...]

    // convert into {Name:Value, ...}
    previewRow = previewRow.reduce((accumlator, currentRow) => {
      accumlator[currentRow.Name] = currentRow.Value
      return accumlator
    }, {})

    let previewRowId = previewRow['_CustomObjectKey']

    // let previewRowId = 100
    logger.debug(`Using rowId: ${previewRowId} to preview email`)

    // find the email activities of the journey
    r = await this.findByName(journeyName, { mostRecentVersionOnly: true })

    let activities = _.get(r, 'items.0.activities')
    let emailActivities = activities.filter(a => a.type === "EMAILV2")

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
      let prefix = subjectPrefixFunc ? subjectPrefixFunc(emailActivities[i]) : '[test]'
      prefix += ' '

      // resolve the email name
      let mcEmail = this.parent.factory('Email')
      let emailObj = await mcEmail.findEmailByLegacyEmailId(emailId)
      let emailName = _.get(emailObj, '0.name')

      // send the email
      let logMsg = `${prefix}${emailSubject}`
      if (logMsg.indexOf(emailName) < 0) {
        // logMsg = `${emailName}: ${logMsg}`
        logMsg = `${logMsg}`
      }

      logger.debug("  " + logMsg)
      let r = await mcEmail.postEmailPreviewSend({
        emailId: emailId,
        deId: deId,
        rowId: previewRowId,
        recipients: recipients,
        subjectPrefix: prefix,

        senderProfileId,
        deliveryProfileId
      })
    }
  }
}

module.exports = Journey