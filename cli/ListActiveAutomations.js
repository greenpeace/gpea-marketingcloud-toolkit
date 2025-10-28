const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger')
const { rruleToHumanReadable } = require('../models/Utils/tools')
const fs = require('fs')
const path = require('path')
const format = require('date-fns/format')
require('dotenv').config()

/**
 * Get human-readable schedule from automation details
 */
function getHumanReadableSchedule(automation, details) {
  // 1. Event-triggered automations
  if (automation.Description === 'Event Definition Automation') {
    return 'Event-triggered'
  }

  // 2. Scheduled with iCalRecur
  if (details?.schedule?.icalRecur) {
    const recurrence = rruleToHumanReadable(details.schedule.icalRecur)
    const time = details.schedule.scheduledTime || ''
    const timezone = details.schedule.timezoneName || ''
    return `${recurrence} at ${time} ${timezone}`.trim()
  }

  // 3. One-time scheduled
  if (details?.schedule?.scheduledTime) {
    const time = details.schedule.scheduledTime
    const timezone = details.schedule.timezoneName || ''
    return `One-time at ${time} ${timezone}`.trim()
  }

  // 4. Fallback to SOAP data
  return automation.ScheduledTime || 'N/A'
}

/**
 * Write results to CSV file
 */
function writeToCSV(allResults, outputPath) {
  const headers = [
    'Market',
    'Name',
    'Status',
    'Schedule',
    'Description',
    'ObjectID',
    'CustomerKey',
    'ProgramID',
    'Type',
    'TypeId',
    'CategoryId',
    'LastRunTime',
    'CreatedDate',
    'ModifiedDate',
    'ObjectState',
    'Owner',
    'ScheduleStartDate',
    'ScheduleEndDate',
    'ScheduleStatus',
    'ScheduleTypeId',
    'ScheduleTimezone',
    'ScheduleICalRecur',
    'StepsCount',
    'ActivitiesCount'
  ]
  const csvLines = [headers.join(',')]

  allResults.forEach(row => {
    const escapedRow = [
      row.market,
      `"${(row.name || '').replace(/"/g, '""')}"`,
      row.status,
      `"${(row.schedule || '').replace(/"/g, '""')}"`,
      `"${(row.description || '').replace(/"/g, '""')}"`,
      row.objectId,
      row.customerKey,
      row.programId,
      `"${(row.type || '').replace(/"/g, '""')}"`,
      row.typeId,
      row.categoryId,
      row.lastRunTime,
      row.createdDate,
      row.modifiedDate,
      row.objectState,
      `"${(row.owner || '').replace(/"/g, '""')}"`,
      row.scheduleStartDate,
      row.scheduleEndDate,
      row.scheduleStatus,
      row.scheduleTypeId,
      `"${(row.scheduleTimezone || '').replace(/"/g, '""')}"`,
      `"${(row.scheduleICalRecur || '').replace(/"/g, '""')}"`,
      row.stepsCount,
      row.activitiesCount
    ]
    csvLines.push(escapedRow.join(','))
  })

  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8')
}

async function main() {
  let markets = ['GPEA', 'TW', 'HK', 'KR']
  let allResults = []

  for (let market of markets) {
    logger.debug(`Checking ${market} market...`)

    // 1. Initialize MCBase for each market
    let mcbase = new MCBase({market})
    await mcbase.doAuth()

    // 2. Get all active automations
    let mcAutomation = mcbase.factory('Automation')
    logger.debug(`Retrieving active automations for ${market}...`)
    let automations = await mcAutomation.findBy({
      field: "IsActive",
      value: "true"
    })

    // 3. Filter for Running (3) and Scheduled (6) status
    let scheduledAutomations = automations.filter(a =>
      ['3', '6'].includes(a.Status)
    )

    // 4. Fetch detailed schedule for each automation
    console.log(`Fetching detailed schedules for ${scheduledAutomations.length} automations...`)
    let enrichedAutomations = []

    for (let i = 0; i < scheduledAutomations.length; i++) {
      const automation = scheduledAutomations[i]
      console.log(`  [${i + 1}/${scheduledAutomations.length}] Fetching: ${automation.Name.substring(0, 50)}...`)
      let details = null
      try {
        details = await mcAutomation.findAutomationByIdRest(automation.ObjectID)
      } catch (error) {
        logger.debug(`Failed to fetch details for ${automation.Name}: ${error.message}`)
      }

      const humanSchedule = getHumanReadableSchedule(automation, details)

      enrichedAutomations.push({
        automation,
        details,
        humanSchedule
      })

      // Count steps and activities from REST details
      let stepsCount = 0
      let activitiesCount = 0
      if (details && details.steps) {
        stepsCount = details.steps.length
        details.steps.forEach(step => {
          if (step.activities) {
            activitiesCount += step.activities.length
          }
        })
      }

      // Store for CSV export with all available fields
      allResults.push({
        // Market info
        market: market,

        // SOAP fields
        name: automation.Name,
        objectId: automation.ObjectID,
        customerKey: automation.CustomerKey || '',
        programId: automation.ProgramID || '',
        description: automation.Description || '',
        status: automation.Status === '3' ? 'Running' : 'Scheduled',
        createdDate: automation.CreatedDate || '',
        modifiedDate: automation.ModifiedDate || '',
        objectState: automation.ObjectState || '',
        owner: automation.Owner || '',

        // REST fields (if available)
        type: details?.type || '',
        typeId: details?.typeId || '',
        categoryId: details?.categoryId || '',
        lastRunTime: details?.lastRunTime || '',

        // Schedule fields from REST
        scheduleStartDate: details?.schedule?.startDate || '',
        scheduleEndDate: details?.schedule?.endDate || '',
        scheduleStatus: details?.schedule?.scheduleStatus || '',
        scheduleTypeId: details?.schedule?.typeId || '',
        scheduleTimezone: details?.schedule?.timezoneName || '',
        scheduleICalRecur: details?.schedule?.icalRecur || '',

        // Human-readable schedule
        schedule: humanSchedule,

        // Automation structure
        stepsCount: stepsCount,
        activitiesCount: activitiesCount
      })
    }

    // 5. Display results in table format
    console.log(`\n=== ${market} Market ===`)
    console.log(`Total Active Automations: ${automations.length}`)
    console.log(`Scheduled/Running: ${scheduledAutomations.length}\n`)

    if (enrichedAutomations.length > 0) {
      console.table(enrichedAutomations.map((item, index) => ({
        '#': index + 1,
        'Name': item.automation.Name.substring(0, 60),
        'Status': item.automation.Status === '3' ? 'Running' : 'Scheduled',
        'Schedule': item.humanSchedule.substring(0, 50),
        'Description': (item.automation.Description || '').substring(0, 40)
      })))
    } else {
      console.log('No scheduled or running automations found.\n')
    }
  }

  // 6. Export to CSV
  const outputDir = path.join(__dirname, '../output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
  const outputPath = path.join(outputDir, `active-automations-${timestamp}.csv`)

  writeToCSV(allResults, outputPath)

  console.log(`\n✅ Results saved to: ${outputPath}`)
  console.log(`   Total automations exported: ${allResults.length}`)
}

(async () => {
  await main()
})().catch(e => {
  logger.error(e.stack)

  if (e.isAxiosError && e.response?.data) {
    logger.error(JSON.stringify(e.response.data, null, 2))
  }
})
