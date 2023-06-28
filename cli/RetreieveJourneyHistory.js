const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const { format, subDays, sub, parse, add } = require('date-fns');

/**
 * Send all the email previews of a journey
 */
async function main() {
  // EDIT HERE!
  let targetJourneyName = 'hk-debit_fail-automd'
  let market = "hk"

  let start = new Date('2023-05-10 00:00:00')
  let end = new Date('2023-05-30 23:59:59')
  let csvFileName = `journey-history-${targetJourneyName}-${format(start, "yyyyMMdd")}-${format(end, "yyyyMMdd")}.csv`

  let deFilter
  // let deFilter = {property:"Recurring Donation Status", simpleOperator:"notEquals", value:"Active"}

  // main
  let mcbase = new MCBase({market})

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')
  let mcEmail = mcbase.factory('Email')
  let mcDE = mcbase.factory('DataExtension')
  let mcSMS = mcbase.factory('SMS')
  let r;

  //

  let csvRows = []
  let csvWriter = createCsvWriter({
    path: csvFileName,
    header: [
      {id: "id", title: "id"},
      {id: "longId", title: "longId"},
      {id: "mid", title: "mid"},
      {id: "eventId", title: "eventId"},
      {id: "definitionId", title: "definitionId"},
      {id: "definitionName", title: "definitionName"},
      {id: "eventName", title: "eventName"},
      {id: "contactKey", title: "contactKey"},
      {id: "entrySource", title: "entrySource"},
      {id: "epochTimeInMilliseconds", title: "epochTimeInMilliseconds"},
      {id: "transactionTime", title: "transactionTime"},
      {id: "status", title: "status"},
      {id: "clientStatus", title: "clientStatus"},
      {id: "message", title: "message"},
      {id: "activityId", title: "activityId"},
      {id: "activityType", title: "activityType"},
      {id: "activityName", title: "activityName"},
      {id: "definitionInstanceId", title: "definitionInstanceId"},
      {id: "createdDate", title: "createdDate"},
      {id: "activityBatchInstanceId", title: "activityBatchInstanceId"},
      {id: "eid", title: "eid"},
      {id: "startDate", title: "startDate"},
      {id: "endDate", title: "endDate"},
      {id: "outcomeActivityId", title: "outcomeActivityId"},
      {id: "sourceType", title: "sourceType"},
      {id: "result.status", title: "result.status"},
      {id: "result.messages", title: "result.messages"},
      {id: "_score", title: "_score"},
      {id: "messageSource", title: "messageSource"},
    ],
    append: false
  });



  // fetch rows
  let rows = await mcJourney.getJourneyHistory(targetJourneyName, {start, end})

  // post-process rows
  rows =  rows.map(row => {
    row['result.status'] = _.get(row, 'result.status')
    row['result.messages'] = _.get(row, 'result.messages')
    row['result.outcome'] = _.get(row, 'result.outcome')
    row['result.outcome'] = row['result.outcome'] ? JSON.stringify(row['result.outcome']) : row['result.outcome']
    return row
  })

  console.log('rows.length', rows.length)

  // write to csv files
  await csvWriter.writeRecords(rows);

  // console.log(JSON.stringify(r, null, 2));

  // parse person level actions
  let contactKeys = rows.map(row => row.contactKey)
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
