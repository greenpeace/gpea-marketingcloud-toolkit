const MCBase = require("../../models/MarketingCloud/Base");
const logger = require("../../lib/logger");
const _ = require("lodash");
const parser = require("cron-parser");
const differenceInDays = require("date-fns/differenceInDays");
const format = require("date-fns/format");

/**
 * To generate the viewable error string for each stage error item
 *
 * @param {Object} item {result: {messages:[{parameters, }]}}
 * @returns
 */
const genItemErrorMsg = (item) => {
  let errMsgs = [];
  // console.log('------')
  // console.log('item', item)

  let resultMessages = _.get(item, "result.messages", []);
  for (let messageIdx = 0; messageIdx < resultMessages.length; messageIdx++) {
    const aMessage = resultMessages[messageIdx];
    // console.log('aMessage', aMessage)

    // format the message string
    let sMessage = aMessage.message;
    if (aMessage.parameters) {
      for (const [k, v] of Object.entries(aMessage.parameters)) {
        sMessage = sMessage.replace("{" + k + "}", v);
      }
    }

    // if (aMessage.level === "Error") {
    errMsgs.push(`contactKey:${item.contactKey} ${item.activityName || ""}: \`${sMessage}\``);
    // }
  }
  // console.log(`errMsgs`, errMsgs)

  return errMsgs.join("\n");
};

/**
 * Check journeys based on the rules
 *
 * @param {MCBase} mcbase
 * @param {array} rules [{name, cumulativePopulation, numContactsCurrentlyInJourney, numContactsAcceptedIn30Days}]
 * @returns
 */
const check = async (mcbase, rules) => {
  // for journeys
  let mcJourney = mcbase.factory("Journey");
  let errors = [];

  // process errors
  let errorRs = await mcJourney.getJourneyErrorHistory((inDays = 1));
  let warningRs = await mcJourney.getJourneyWarnHistory((inDays = 1));

  // process together
  let notificationItems = [...errorRs.items, ...warningRs.items]
  let notificationGroup = _.groupBy(notificationItems, "definitionName");

  _.forEach(notificationGroup, (items, journeyName) => {
    let thisErrMsg = "";
    let errorTypeGroups = {
      "ContactPreviouslyInSameInteraction": [],
      "ListDetective": [],
      "SuppressionLogic": [],
      "GlobalUnsubscribeList": [],
      "InvalidEmail": [],
      "MetExitCriteria": [],
      "MetGoalCriteria": [],
      "CurrentlyWaitingInSameInteraction": [],
      "Others": [],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let resultMessages = _.get(item, "result.messages", []);

      if (resultMessages.some((m) => m.message.indexOf("excluded by List Detective") >= 0)) {
        errorTypeGroups.ListDetective.push(item);
      } else if (resultMessages.some((m) => m.message.indexOf("excluded by Suppression logic") >= 0)) {
        errorTypeGroups.SuppressionLogic.push(item);
      } else if (resultMessages.some((m) => m.message.indexOf("on the Global Unsubscribe List") >= 0)) {
        errorTypeGroups.GlobalUnsubscribeList.push(item);
      } else if (resultMessages.some((m) => m.message.indexOf("Email Address for this subscriber has invalid syntax") >= 0)) {
        errorTypeGroups.InvalidEmail.push(item);
      } else if (resultMessages.some((m) => m.errorCode.indexOf("InvalidDefaultEmail") >= 0)) {
        errorTypeGroups.InvalidEmail.push(item);
      } else if (resultMessages.some((m) => m.message.indexOf("MetExitCriteria") >= 0)) {
        errorTypeGroups.MetExitCriteria.push(item);
      } else if (resultMessages.some((m) => m.message.indexOf("MetGoalCriteria") >= 0)) {
        errorTypeGroups.MetGoalCriteria.push(item);
      } else if (resultMessages.some((m) => m.errorCode.indexOf("CurrentlyWaitingInSameInteraction") >= 0)) {
        errorTypeGroups.CurrentlyWaitingInSameInteraction.push(item);
      } else if (item.status === "ContactPreviouslyInSameInteraction") {
        errorTypeGroups.ContactPreviouslyInSameInteraction.push(item);
      } else {
        errorTypeGroups.Others.push(item);
      }
    }

    let countsMsgs = [];
    // let candidateErrTypes = ['Others', 'ListDetective', 'SuppressionLogic', 'InvalidEmail', 'MetExitCriteria', 'CurrentlyWaitingInSameInteraction', 'ContactPreviouslyInSameInteraction']
    let candidateErrTypes = ["Others", "SuppressionLogic", "GlobalUnsubscribeList", "InvalidEmail"]; // only show specific errors
    let warningCounts = 0;

    candidateErrTypes.forEach((k) => {
      if (errorTypeGroups[k].length >= 5) {
        // only show when there's more than 5 errors
        countsMsgs.push(`${errorTypeGroups[k].length} ${k}`);
        warningCounts += k;
      }
    });

    if (warningCounts) {
      thisErrMsg += `- *${journeyName}* ${countsMsgs.join(", ")}`;

      let itemErrMsgs = [];
      for (let i = 0; i < errorTypeGroups.Others.length && i < 10; i++) {
        itemErrMsgs.push("\t- " + genItemErrorMsg(errorTypeGroups.Others[i]));
      }
      if (itemErrMsgs.length) {
        thisErrMsg += "\n" + itemErrMsgs.join("\n");
      }

      errors.push({ journeyName: journeyName, items: items, message: thisErrMsg });
    }
  });

  return { errors };
};

module.exports = check;
