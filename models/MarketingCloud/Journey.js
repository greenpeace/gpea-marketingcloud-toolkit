const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')
const subDays = require('date-fns/subDays')

class Journey {
  /**
   * Retriebe the full journey list
   * @return {array}
   */
  async getAll () {
    let page = 1
    let items = []

    while (true) {
      let url = `${this.parent.restEndpoint}/interaction/v1/interactions?$page=${page}`
      let response = await axios.get(url, {
        headers: {"authorization": `Bearer ${this.parent.accessToken}`}
      })

      // concate the found journeys
      let data = response.data
      items = items.concat(data.items)
      logger.debug(`Fetched ${data.items.length} journeys for page ${page}`)

      // determine should we run next
      if (data.page*data.pageSize>=data.count) {
        break
      } else if (page>=50) {
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
   *       name: 'tw-reactivation-automd-lapsed_donors',
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
   * 
   * @param {string} journeyName 
   * @param {dict} options 
   *     options.mostRecentVersionOnly bool
   * @returns 
   */
  async findByName(journeyName, options={}) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions?name=${journeyName}&mostRecentVersionOnly=${options.mostRecentVersionOnly ? 'true':'false'}&extras=all`
    let response = await axios.get(url, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

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

    if ( !foundJourney) {
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
    let metCriteriaSuccessRow = triggerstats.find(row => row.eventType === 'MetCriteria' && row.category ==='success')
    let numContactsAcceptedIn30Days = metCriteriaSuccessRow ? metCriteriaSuccessRow.count : 0

    return { 
      cumulativePopulation, 
      numContactsCurrentlyInJourney, 
      numContactsAcceptedIn30Days,
      journey: foundJourney }
  }

  /**
   * To pause a journey
   * 
   * Usage:
   *   res = await mcJourney.pause(journeyId, {
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
  async pause (journeyId, options) {
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
  async resume (journeyId, options={}) {
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

    if (response.data.errors && response.data.errors.length>0) {
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
  async stop (journeyId, options={}) {
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

    if (response.data.errors && response.data.errors.length>0) {
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

    if (response.data.errors && response.data.errors.length>0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }

  async getJourneyErrorHistory (inDays=1) {
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

    if (response.data.errors && response.data.errors.length>0) {
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
  async getContactJourneyStatus (journeyDefinitionId, contactKey) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions/journeyhistory/contactkey?$page=1&$pageSize=1000`
    let response = await axios.post(url, {
      "definitionIds": [journeyDefinitionId],
      "queryString": `${contactKey}*`
    }, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length>0) {
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
  async updateJourney (journeyDetails) {
    let url = `${this.parent.restEndpoint}/interaction/v1/interactions`

    let response = await axios.put(url, journeyDetails, {
      headers: { "authorization": `Bearer ${this.parent.accessToken}` }
    })

    if (response.data.errors && response.data.errors.length>0) {
      logger.error(JSON.stringify(response.data.errors))
    }

    return response.data
  }
}

module.exports = Journey