const axios = require('axios');
const _ = require("lodash")
const logger = require('../../lib/logger');


/**
 * Appendix for Automation Objects
 *
 * # 1. Relationship between Objects
 * The following objects have a relationship in the Automation Studio:
 *
 * Program → Task → Activity
 * Program.ObjectID = Task.Program.ObjectID
 * Task.ObjectID = Activity.Task.ObjectID
 * QueryDefinition.ObjectID = Activity.Definition.ObjectID
 *
 * For more information on Automation Studio API Objects,
 * visit https://charliefay.medium.com/sfmc-automation-studio-api-objects-620ec868239b
 *
 *
 * # 2. Automation Status Codes:
 * -1: Error - The program has encountered an error.
 * 0: BuildingError - The program encountered an error during building.
 * 1: Building - The program is building with activities, schedules, and other elements.
 * 2: Ready - The program is ready to start.
 * 3: Running - The program is currently running.
 * 4: Paused - The program has been paused from running state.
 * 5: Stopped - The program has been stopped by the user.
 * 6: Scheduled - The program is scheduled to run at the specified date and time.
 * 7: Awaiting Trigger - The program is waiting for a trigger to start.
 * 8: InactiveTrigger - The program trigger is inactive.
 *
 * Note: Status codes cannot be used in filters!!
 */
class Automation {
  /**
  * To retrieve automation details by ID by using the REST API.
  * Note: The Automation ObjectId equals to the ProgramId ( program is the old name of automation)
  *
  * @param {string} automationObjectId The ID of the automation to retrieve
  *
  * @returns {Object} The details of the specified automation
  * @property {string} id - The ID of the automation.
  * @property {string} name - The name of the automation.
  * @property {string} description - The description of the automation.
  * @property {string} key - The key of the automation.
  * @property {number} typeId - 1:Scheduled, 2:Triggered, 3:User-Initiated, 4:API-Triggered, 5:File-Drop
  * @property {string} type - The type of the automation.
  * @property {number} statusId - 0:Deleted, 1:Ready, 2:Running, 3:Paused, 4:Waiting, 5:Scheduled, 6:Completed, 7:Canceling, 8:Canceled, 9:Faulted
  * @property {string} status - The status of the automation.
  * @property {number} categoryId - The category ID of the automation.
  * @property {string} lastRunTime - The date and time the automation was last run.
  * @property {string} lastRunInstanceId - The ID of the last run instance of the automation.
  * @property {Object} schedule - The schedule settings of the automation.
  * @property {string} schedule.id - The ID of the schedule.
  * @property {number} schedule.typeId - 1:Scheduled 2:Triggered 3:User-Initiated 4:API Event 5:Recurring
  * @property {string} schedule.startDate - The start date of the schedule.
  * @property {string} schedule.endDate - The end date of the schedule.
  * @property {string} schedule.scheduledTime - The scheduled time of the schedule.
  * @property {number} schedule.rangeTypeId - The range type ID of the schedule.
  * @property {number} schedule.occurrences - The number of occurrences of the schedule.
  * @property {string} schedule.pattern - The pattern of the schedule.
  * @property {string} schedule.icalRecur - The iCalendar recurrence rule of the schedule.
  * @property {string} schedule.timezoneName - The timezone name of the schedule.
  * @property {string} schedule.scheduleStatus - The status of the schedule.
  * @property {number} schedule.timezoneId - The timezone ID of the schedule.
  * @property {Array} steps - The steps of the automation.
  * @property {Object} steps[].id - The ID of the step.
  * @property {string} steps[].name - The name of the step.
  * @property {number} steps[].step - The step number.
  * @property {Array} steps[].activities - The activities of the step.
  * @property {string} steps[].activities[].id - The ID of the activity.
  * @property {string} steps[].activities[].name - The name of the activity.
  * @property {string} steps[].activities[].activityObjectId - The object ID of the activity.
  * @property {number} steps[].activities[].objectTypeId - The object type ID of the activity.
  * @property {number} steps[].activities[].displayOrder - The display order of the activity.
  * @property {Array} steps[].activities[].targetDataExtensions - The target data extensions of the activity.
  * @property {string} steps[].activities[].targetDataExtensions[].id - The ID of the target data extension.
  * @property {string} steps[].activities[].targetDataExtensions[].name - The name of the target data extension.
  * @property {string} steps[].activities[].targetDataExtensions[].key - The key of the target data extension.
  * @property {string} steps[].activities[].targetDataExtensions[].description - The description of the target data extension.
  * @property {number} steps[].activities[].targetDataExtensions[].rowCount - The row count of the target data extension.
  */
  async findAutomationByIdRest(automationObjectId) {
    // Ensure that the automationObjectId parameter is provided
    if (!automationObjectId) {
      throw new Error('Automation ID is required');
    }

    // Construct the URL to retrieve the automation details
    const url = `${this.parent.restEndpoint}/automation/v1/automations/${automationObjectId}`

    try {
      // Make the request to the REST API
      const response = await axios.get(url, {
        headers: { "authorization": `Bearer ${this.parent.accessToken}` }
      });

      // Check if the response contains any errors
      if (response.data.errors && response.data.errors.length > 0) {
        throw new Error(JSON.stringify(response.data.errors));
      }

      // Return the automation details
      return _.isEmpty(response.data) ? null : response.data;
    } catch (error) {
      // Handle any errors that occurred during the request
      throw new Error(`Failed to retrieve automation: ${error.message}`);
    }
  }

  /**
   * For the given QueryDefinitionObjectId, fetch its original automation object
   * @param {string} qryDefObjectId
   * @reutnr {Object} return the object of function findAutomationByIdRest
   */
  async findAutomationsByQueryDefObjectIdRest(qryDefObjectId) {
    // find the activity which related to this query definition
    let activities = await this.findActivitiesBy({
      field: "Definition.ObjectID",
      value: qryDefObjectId
    })
    if (activities.length<1) {
      logger.warn(`Cannot find the automation activity by id: ${qryDefObjectId}`)
      return null
    } else if (activities.length>1) {
      logger.warn(`Found ${activities.length} activities which related to the query definition ${qryDefObjectId}`)
    }

    // find the original automation
    let automations = []

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      let programObjectId = _.get(activity, 'Program.ObjectID')
      let taskObjectId = _.get(activity, 'Task.ObjectID')
      let automation = null

      if (programObjectId) {
        automation = await this.findAutomationByIdRest(programObjectId)
      }
      if (automation) {
        automations.push(automation)
      } else {
        logger.info(`Cannot fin dthe automation by activity's program id ${programObjectId}`)
      }
    }

    return automations
  }

  async findBy(criteria) {
    let rbody = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope
        xmlns:s = "http://www.w3.org/2003/05/soap-envelope"
        xmlns:a = "http://schemas.xmlsoap.org/ws/2004/08/addressing"
        xmlns:u = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" >
        <s:Header>
          <a:Action s:mustUnderstand="1">Retrieve</a:Action>
          <a:To s:mustUnderstand="1">https://${this.parent.subDomain}.soap.marketingcloudapis.com/Service.asmx</a:To>
          <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
        </s:Header>
        <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <RetrieveRequest>
              <ObjectType>Automation</ObjectType>

              <Properties>ObjectID</Properties>
              <Properties>Name</Properties>
              <Properties>CustomerKey</Properties>
              <Properties>Status</Properties>
              <Properties>ScheduledTime</Properties>
              <Properties>CreatedDate</Properties>
              <Properties>ObjectState</Properties>
              <Properties>Owner</Properties>
              <Properties>Schedule</Properties>
              <Properties>CreatedDate</Properties>
              <Properties>ModifiedDate</Properties>
              <Properties>Description</Properties>
              <Properties>ProgramID</Properties>

              <Filter xsi:type="SimpleFilterPart">
                <Property>${criteria["field"]}</Property>
                <SimpleOperator>equals</SimpleOperator>
                <Value>${criteria["value"]}</Value>
              </Filter>
            </RetrieveRequest>
          </RetrieveRequestMsg>
        </s:Body>
      </s:Envelope>
      `
    // console.log('rbody', rbody)
    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: { 'Content-Type': 'application/soap+xml' }
    })

    return await this.parent.handleSoapResponse(response)
  }

  /**
   * To delete an automation
   *
   * @param {string} customerKey The customer Key of the automation
   * @returns Throw exception if not found or something wrong
   */
  async delete(customerKey) {
    let rbody = `<?xml version="1.0" encoding="UTF-8"?>
    <s:Envelope
      xmlns:s = "http://www.w3.org/2003/05/soap-envelope"
      xmlns:a = "http://schemas.xmlsoap.org/ws/2004/08/addressing"
      xmlns:u = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" >
      <s:Header>
        <a:Action s:mustUnderstand="1">Delete</a:Action>
        <a:To s:mustUnderstand="1">https://${this.parent.subDomain}.soap.marketingcloudapis.com/Service.asmx</a:To>
        <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
      </s:Header>
      <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
          <Options></Options>
          <Objects xsi:type="Automation">
            <PartnerKey xsi:nil="true"></PartnerKey>
            <ObjectID xsi:nil="true"></ObjectID>
            <CustomerKey>${customerKey}</CustomerKey>
          </Objects>
        </DeleteRequest>
      </s:Body>
    </s:Envelope>
    `
    // console.log('rbody', rbody)
    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: { 'Content-Type': 'application/soap+xml' }
    })

    return await this.parent.handleSoapResponse(response)
  }

  /**
   * To get all QueryDefinitions
   *
   * @returns {Array} An array of query activities. Sample:
   * {
   *   "PartnerKey": "",
   *   "ObjectID": "df58e4e8-c849-4da3-85ca-3a672b5477a4",
   *   "CustomerKey": "2d5d59c6-9baa-4ec5-8718-6982b31fd066",
   *   "Name": "hk-annual_reactivation-automd-new_lapsed",
   *   "Description": "last donation in 12, 24 months.",
   *   "QueryText": "SELECT FROM WHERE",
   *   "TargetType": "DE",
   *   "DataExtensionTarget": {
   *     "PartnerKey": "",
   *     "ObjectID": "",
   *     "CustomerKey": "92D5B6F1-67F5-462D-A59C-60D8EDC59D8D",
   *     "Name": "hk-reactivation-automd-lasped_donor-audiences",
   *     "Description": ""
   *   },
   *   "TargetUpdateType": "Overwrite",
   *   "FileSpec": "",
   *   "FileType": "",
   *   "Status": "Active",
   *   "CategoryID": "1035"
   * },
   */
  async getAllQueryDefinitions() {
    let rbody = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope
        xmlns:s = "http://www.w3.org/2003/05/soap-envelope"
        xmlns:a = "http://schemas.xmlsoap.org/ws/2004/08/addressing"
        xmlns:u = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" >
        <s:Header>
          <a:Action s:mustUnderstand="1">Retrieve</a:Action>
          <a:To s:mustUnderstand="1">https://${this.parent.subDomain}.soap.marketingcloudapis.com/Service.asmx</a:To>
          <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
        </s:Header>
        <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <RetrieveRequest>
              <ObjectType>QueryDefinition</ObjectType>
              <Properties>CategoryID</Properties>
              <Properties>CustomerKey</Properties>
              <Properties>DataExtensionTarget.CustomerKey</Properties>
              <Properties>DataExtensionTarget.Description</Properties>
              <Properties>DataExtensionTarget.Name</Properties>
              <Properties>Description</Properties>
              <Properties>FileSpec</Properties>
              <Properties>FileType</Properties>
              <Properties>Name</Properties>
              <Properties>ObjectID</Properties>
              <Properties>QueryText</Properties>
              <Properties>Status</Properties>
              <Properties>TargetType</Properties>
              <Properties>TargetUpdateType</Properties>
              <Filter xsi:type="SimpleFilterPart">
                <Property>Name</Property>
                <SimpleOperator>notEquals</SimpleOperator>
                <Value>XXX</Value>
              </Filter>
            </RetrieveRequest>
          </RetrieveRequestMsg>
        </s:Body>
      </s:Envelope>
      `

    let response = await axios.post(this.parent.soapEndpoint, rbody, {
      headers: { 'Content-Type': 'application/soap+xml' }
    })

    return await this.parent.handleSoapResponse(response)
  }


  /**
   * Find the query definitions that update/rewrite the given data extension.
   *
   * @param {string} deCustomerKey - The CustomerKey of the target Data Extension.
   * @returns {Array} An array of QueryDefinition objects that update/rewrite the given Data Extension.
   */
  async getQueryDefinitionsForDataExtension(deCustomerKey) {
    // Cache the queryDefinitions for future calls
    if (this.queryDefinitions) {
      // use cached version
    } else {
      let queryDefinitions = await this.getAllQueryDefinitions()
      if (queryDefinitions) {
        this.queryDefinitions = queryDefinitions; // cache it
      }
    }

    // find Query Definition which related to this DE
    return this.queryDefinitions.filter(qDef => {
      return _.get(qDef, 'DataExtensionTarget.CustomerKey') === deCustomerKey
    })
  }

  /**
   * To retrieve an Activity
   *
   * Sample Usage {field:"Definition.ObjectID", value:"df58e4e8-c849-4da3-85ca-3a672b5477a4"}
   * // find by the query definition objectId
   *
   * @param {Object} criteria {"field":"Name", "value":deName}
   * @returns {Array or an Object} The details of the specified Activity
   * @throws {Error} If an error occurs during the request or the response contains errors
   */
  async findActivitiesBy(criteria) {
    // Construct the SOAP request body
    const requestBody = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <s:Header>
          <a:Action s:mustUnderstand="1">Retrieve</a:Action>
          <a:To s:mustUnderstand="1">${this.parent.soapEndpoint}</a:To>
          <fueloauth xmlns="http://exacttarget.com">${this.parent.accessToken}</fueloauth>
        </s:Header>
        <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <RetrieveRequest>
              <ObjectType>Activity</ObjectType>
              <Properties>ObjectID</Properties>
              <Properties>CustomerKey</Properties>
              <Properties>Program.ObjectID</Properties>
              <Properties>Task.ObjectID</Properties>
              <Properties>Name</Properties>
              <Properties>Description</Properties>
              <Properties>Sequence</Properties>
              <Properties>Definition.ID</Properties>
              <Properties>Definition.ObjectID</Properties>
              <Properties>PartnerAPIObjectTypeID</Properties>
              <Properties>Definition</Properties>
              <Properties>IsActive</Properties>
              <Properties>Client.ID</Properties>
              <Properties>Client.CreatedBy</Properties>
              <Properties>Client.ModifiedBy</Properties>
              <Properties>Client.EnterpriseID</Properties>
              <Properties>CreatedDate</Properties>
              <Properties>ModifiedDate</Properties>
              <Filter xsi:type="SimpleFilterPart">
                <Property>${criteria["field"]}</Property>
                <SimpleOperator>equals</SimpleOperator>
                <Value>${criteria["value"]}</Value>
              </Filter>
            </RetrieveRequest>
          </RetrieveRequestMsg>
        </s:Body>
      </s:Envelope>
    `;

    try {
      // Make the request to the SOAP API
      const response = await axios.post(this.parent.soapEndpoint, requestBody, {
        headers: { 'Content-Type': 'application/soap+xml' }
      });

      // Handle the SOAP response
      let soapResponse =  await this.parent.handleSoapResponse(response);
      return Array.isArray(soapResponse) ? soapResponse : [soapResponse] // wrap with array to make sure it always return an array

    } catch (error) {
      // Handle any errors that occurred during the request
      throw new Error(`Failed to retrieve Activity: ${error.message}`);
    }
  }
}

module.exports = Automation