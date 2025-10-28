const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger')
const { rruleToHumanReadable } = require('../models/Utils/tools')
const fs = require('fs')
const path = require('path')
const format = require('date-fns/format')
const readline = require('readline')
require('dotenv').config()

/**
 * Ask user for confirmation
 */
async function askConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer === '')
    })
  })
}

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
 * Get status label
 */
function getStatusLabel(statusCode) {
  const statusMap = {
    '-1': 'Error',
    '0': 'BuildingError',
    '1': 'Building',
    '2': 'Ready',
    '3': 'Running',
    '4': 'Paused',
    '5': 'Stopped',
    '6': 'Scheduled',
    '7': 'AwaitingTrigger',
    '8': 'InactiveTrigger'
  }
  return statusMap[statusCode] || statusCode
}

/**
 * Write results to CSV file
 */
function writeToCSV(results, outputPath) {
  const headers = [
    'Timestamp',
    'Market',
    'AutomationName',
    'ObjectID',
    'PreviousStatus',
    'Result',
    'ErrorMessage'
  ]
  const csvLines = [headers.join(',')]

  results.forEach(row => {
    const escapedRow = [
      row.timestamp,
      row.market,
      `"${(row.automationName || '').replace(/"/g, '""')}"`,
      row.objectId,
      row.previousStatus,
      row.result,
      `"${(row.errorMessage || '').replace(/"/g, '""')}"`
    ]
    csvLines.push(escapedRow.join(','))
  })

  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8')
}

async function main() {
  // ========================================
  // EDIT HERE!
  // ========================================
  let automationsToPause = {
    'gpea': [
      '02-Is Email Bounced Update',
      '500009930-PSExtended-24',
      '500009930-PSHist#01',
      '500009930-PSMain',
      'Alert_No_IER',
      'Contact Delete Automation',
      'Greenpeace Customer Data Layer (Parent Bu)',
      'In_Petition_Journey_MC - Data Population'
    ],
    'tw': [
      'line_get_all_binding_list',
      'line_get_ebull_list_with_line_info',
      'region-automd-20250604-email_engagement_and_bounce_counts_for_hubspot_ipwarming',
      'TW Customer Data Layer ',
      'TW Email History For Salesforce',
      'tw-abandon_conversion-automd-abandon_cart-20230517',
      'tw-auto_greennews-automd-grab_articles',
      'tw-auto_p8_subscription-greenpost-biweekly-audience-journey',
      'tw-comms-automd-ebull_n_enews-audiences',
      'tw-comms-automd-ebull-audiences-ipwarming',
      'tw-comms-automd-email_list-activist-20240104',
      'tw-comms-automd-email_list-green_future-20211007',
      'tw-comms-automd-email_list-volunteer-20211007',
      'tw-debit_fail-automd',
      'tw-debit_fail-automd-weekly_reminder',
      'tw-expired_card-automd-audiences',
      'tw-lead_conversion-automd-case_creation',
      'tw-new_donor_upgrade-automd-audiences_2025_Contact_Journey',
      'tw-oneoff_conversion-automd-sg2rg_monthly-lapsed_donor-20240328',
      'tw-reactivation-automd-lapsed_donor-audiences',
      'tw-renewal-automd-fixed_donation_date-audiences',
      'tw-transactional-automd-first_donation_receipt-20220401',
      'tw-unfreeze_inactive-automd-audiences',
      'Tw-unfreeze_inactive-automd-audiences_cancelled',
      'tw-utils-automd-campaign_member_counts',
      'tw-utils-automd-contact_audience-release_stuck_contacts-20231212',
      'tw-utils-automd-Customer_Data_Layer',
      'tw-utils-automd-debit_fail',
      'tw-utils-automd-export_civis_trackings',
      'tw-utils-automd-other-market-suppression'
    ],
    'hk': [
      'HK Email History For Salesforce',
      'hk-abandon_conversion-automd-web-transaction-unfinished-20230811',
      'hk-comms-automd-all_subscribers-audiences',
      'hk-comms-automd-campaign_specific_audiences-audiences',
      'hk-comms-automd-campaign_subscribers-audiences',
      'hk-comms-automd-ebull_n_enews-audiences',
      'hk-comms-automd-lantau-passcode-iscliamed-de',
      'hk-comms-automd-MasterClass-passcode-iscliamed-de',
      'hk-dd_followup-automd-audiences',
      'hk-debit_fail-automd',
      'hk-debit_fail-automd-weekly_reminder',
      'hk-enews-ebull-removed-contactaudience-list-automation',
      'hk-lead_conversion-automd-leftover_case_creation',
      'hk-lead_conversion-automd-web-transaction-failed-20230213',
      'hk-lead_conversion-automd-web-transaction-failed-20230213 - 2023-04-16T041451.514',
      'hk-lead_conversion-automd-web-transaction-failed-20230415 - 2023-04-16T083111.943',
      'hk-lead_conversion-automd-web-transaction-unfinished-20230213 - 2023-04-14T220737.290',
      'hk-lead_conversion-automd-whatsapp_project-lantau_documentary_infopage_relaunch-20231121',
      'hk-new_donor_upgrade-automd-audiences',
      'hk-reactivation-automd-lasped_donor-audiences',
      'hk-transactional-automd-legacies_and_Oceans_E_Cert_20250522',
      'hk-transactional-automd-welcome_new_donor_first_donation_receipt-20220401',
      'hk-unfreeze_inactive-automd-inactive_donor',
      'hk-utils-automd-contact_audience-release_stuck_contacts-20231220',
      'hk-utils-automd-Customer_Data_Layer',
      'hk-utils-automd-debit_fail',
      'hk-utils-automd-einstein_engagement_frequency',
      'hk-utils-automd-export_civis_trackings',
      'hk-utils-automd-opensclicks-statistic',
      'hk-utils-automd-other-market-suppression',
      'JB Event hk-20210315-tax-oneoff-followup bf3c76a4-aa16-4154-ba35-436efe1e736f'
    ],
    'kr': [
      'KR Email History For Salesforce',
      'kr_2022-new_donor_upgrade - 2022-08-18T031740.276',
      'kr_2022-new-donor-reactivation-lapsed',
      'kr-2022-lead_conversion-manual-facebook - 2022-04-08T051058.709',
      'kr-2022-volunteer',
      'kr-Alimtalk-Only_Welcome-OneOff_REVISED - 2024-01-20T004439.770',
      'kr-Alimtalk-Only_Welcome-Regular_REVISED - 2024-01-20T005309.662',
      'kr-cms_authorisation-2022-auto',
      'kr-CMS-authorization-revised-2022 - 2022-08-23T064626.060',
      'kr-CMS-cancellation',
      'kr-CMS-cancellation - 2022-06-07T062736.459',
      'kr-debit_fail-automd',
      'kr-debit_fail-automd-weekly_reminder',
      'kr-debit_fail-CMS-automd - 2022-12-16T022159.981',
      'kr-debit_fail-CMS-automd - 2023-09-15T003701.974',
      'kr-debit_fail-credit_card-automd - 2023-08-16T211211.870',
      'kr-held-active - 2022-11-14T222146.237',
      'kr-held-active-auto',
      'kr-journey-SMS-welcome-new-oneoff-donor',
      'kr-journey-SMS-welcome-new-oneoff-donor-revised',
      'kr-journey-SMS-welcome-new-regular-donor-revised',
      'kr-journey-welcome-new-donor-scheduled-welcome-gift - 2022-05-31T204754.326',
      'kr-journey-welcome-new-donor-welcome-pack - 2022-05-26T025626.396',
      'kr-lc-automd-ocean-yonggitest',
      'kr-lead_conversion-automd-abandon_payment_failure-tfr-20230227 - 2023-06-26T023206.240',
      'kr-lead_conversion-automd-ce-animaltest-20221024 - 2022-11-15T234515.901',
      'kr-oneoff_conversion-automd-sg2rg-revised-v2 - 2024-01-16T233558.787',
      'kr-reactivation-automd-reactivation-general-donation_page-20231208',
      'kr-unfreeze_inactive-automd-audiences',
      'kr-utils-automd-campaign_member_counts',
      'kr-utils-automd-contact_audience-release_stuck_contacts-20231220',
      'kr-utils-automd-debit_fail',
      'kr-utils-automd-export_civis_trackings',
      'kr-utils-automd-other-market-suppression',
      'kr-welcome_new_donor-automd-sms-oneoff-20240315 - 2025-01-15T195202.927',
      'kr-welcome_new_donor-automd-sms-recurring-20240311 - 2025-01-14T064217.583',
      'kr-welcome-new_donor-welcome_pack',
      'Reactivation Journey_221213 - 2023-03-02T185114.859'
    ]
  }

  // ========================================
  // Script logic below (don't edit)
  // ========================================

  // Filter out empty markets
  let marketsToProcess = Object.keys(automationsToPause)
    .filter(market => automationsToPause[market].length > 0)
    .map(market => market.toUpperCase())

  if (marketsToProcess.length === 0) {
    console.log('No automations specified to pause.')
    console.log('Please edit the script and add automation names to the automationsToPause object.')
    return
  }

  console.log(`\nProcessing ${marketsToProcess.length} market(s): ${marketsToProcess.join(', ')}`)

  // Skip markets info
  let allMarkets = ['GPEA', 'TW', 'HK', 'KR']
  let skippedMarkets = allMarkets.filter(m => !marketsToProcess.includes(m))
  if (skippedMarkets.length > 0) {
    console.log(`(Skipping ${skippedMarkets.join(', ')} - no automations specified)\n`)
  }

  let allFoundAutomations = []
  let allNotFoundAutomations = []
  let allAlreadyPausedAutomations = []

  // Process each market
  for (let market of marketsToProcess) {
    console.log(`=== Connecting to ${market} market ===`)

    // Initialize MCBase
    let mcbase = new MCBase({ market })
    await mcbase.doAuth()
    console.log(`✓ Authenticated successfully`)

    // Get automation instance
    let mcAutomation = mcbase.factory('Automation')

    // Get automation names for this market
    let automationNames = automationsToPause[market.toLowerCase()] || []

    // Find each automation
    for (let name of automationNames) {
      try {
        let automations = await mcAutomation.findBy({
          field: 'Name',
          value: name
        })

        if (!automations || automations.length === 0) {
          allNotFoundAutomations.push({ market, name })
        } else {
          // Get first match (should be unique by name)
          let automation = Array.isArray(automations) ? automations[0] : automations

          // Check if already paused
          if (automation.Status === '4') {
            allAlreadyPausedAutomations.push({
              market,
              automation
            })
          } else {
            // Fetch detailed schedule info
            let details = null
            try {
              details = await mcAutomation.findAutomationByIdRest(automation.ObjectID)
            } catch (error) {
              logger.debug(`Could not fetch REST details for ${name}: ${error.message}`)
            }

            allFoundAutomations.push({
              market,
              automation,
              details,
              schedule: getHumanReadableSchedule(automation, details)
            })
          }
        }
      } catch (error) {
        logger.error(`Error finding automation ${name} in ${market}: ${error.message}`)
        allNotFoundAutomations.push({ market, name })
      }
    }

    let totalRequested = automationNames.length
    let totalFound = allFoundAutomations.filter(a => a.market === market).length
    let totalAlreadyPaused = allAlreadyPausedAutomations.filter(a => a.market === market).length
    let totalNotFound = allNotFoundAutomations.filter(a => a.market === market).length

    console.log(`✓ Found ${totalFound} out of ${totalRequested} automation(s)`)
    if (totalAlreadyPaused > 0) {
      console.log(`⚠  Already paused: ${totalAlreadyPaused} automation(s)`)
    }
    if (totalNotFound > 0) {
      console.log(`✗ Not found: ${totalNotFound} automation(s)`)
      allNotFoundAutomations.filter(a => a.market === market).forEach(a => {
        console.log(`  - ${a.name}`)
      })
    }
    console.log('')
  }

  // Check if we have any automations to pause
  if (allFoundAutomations.length === 0) {
    console.log('\n⚠️  No automations found to pause.')
    if (allNotFoundAutomations.length > 0) {
      console.log(`\nAll ${allNotFoundAutomations.length} automation(s) were not found.`)
    }
    if (allAlreadyPausedAutomations.length > 0) {
      console.log(`\n${allAlreadyPausedAutomations.length} automation(s) are already paused:`)
      allAlreadyPausedAutomations.forEach(({ market, automation }) => {
        console.log(`  - ${market}: ${automation.Name}`)
      })
    }
    return
  }

  // Display summary table
  console.log(`About to PAUSE ${allFoundAutomations.length} automation(s) across ${marketsToProcess.length} market(s):\n`)

  // Prepare table data
  let tableData = allFoundAutomations.map((item, index) => ({
    'Market': item.market,
    '#': index + 1,
    'Name': item.automation.Name.substring(0, 50),
    'Status': getStatusLabel(item.automation.Status),
    'Schedule': item.schedule.substring(0, 40),
    'ObjectID': item.automation.ObjectID.substring(0, 13) + '...'
  }))

  console.table(tableData)

  // Show warnings if any
  if (allAlreadyPausedAutomations.length > 0) {
    console.log(`\n⚠️  Warning: ${allAlreadyPausedAutomations.length} automation(s) are already paused:`)
    allAlreadyPausedAutomations.forEach(({ market, automation }) => {
      console.log(`  - ${market}: ${automation.Name}`)
    })
    console.log('These will be skipped.\n')
  }

  if (allNotFoundAutomations.length > 0) {
    console.log(`\n⚠️  Warning: ${allNotFoundAutomations.length} automation(s) were not found:`)
    allNotFoundAutomations.forEach(({ market, name }) => {
      console.log(`  - ${market}: ${name}`)
    })
    console.log('')
  }

  // Confirmation prompt
  let marketCounts = {}
  marketsToProcess.forEach(market => {
    marketCounts[market] = allFoundAutomations.filter(a => a.market === market).length
  })
  let countsStr = marketsToProcess.map(m => `${m}: ${marketCounts[m]}`).join(', ')

  console.log(`⚠️  This will pause ${allFoundAutomations.length} automation(s) across ${marketsToProcess.length} market(s) (${countsStr}).`)
  const confirmed = await askConfirmation('Continue? (Y/n): ')

  if (!confirmed) {
    console.log('\nOperation cancelled by user.')
    return
  }

  // Pause automations
  console.log('\nPausing automations...\n')

  let results = []
  let currentMarket = null

  for (let i = 0; i < allFoundAutomations.length; i++) {
    const item = allFoundAutomations[i]
    const { market, automation } = item

    // Print market header when switching markets
    if (currentMarket !== market) {
      console.log(`=== ${market} Market ===`)
      currentMarket = market
    }

    const timestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
    let result = {
      timestamp,
      market,
      automationName: automation.Name,
      objectId: automation.ObjectID,
      previousStatus: getStatusLabel(automation.Status),
      result: 'Failed',
      errorMessage: ''
    }

    try {
      // Re-auth if needed
      let mcbase = new MCBase({ market })
      await mcbase.doAuth()
      let mcAutomation = mcbase.factory('Automation')

      // Pause the automation
      await mcAutomation.pause(automation.ObjectID)

      console.log(`✓ [${i + 1}/${allFoundAutomations.length}] ${automation.Name.substring(0, 50)} - Paused successfully`)
      result.result = 'Success'
    } catch (error) {
      console.log(`✗ [${i + 1}/${allFoundAutomations.length}] ${automation.Name.substring(0, 50)} - Failed: ${error.message}`)
      result.errorMessage = error.message
    }

    results.push(result)
  }

  // Summary
  let succeeded = results.filter(r => r.result === 'Success').length
  let failed = results.filter(r => r.result === 'Failed').length

  console.log(`\n${succeeded > 0 ? '✅' : '⚠️'}  Summary:`)
  console.log(`   Markets: ${marketsToProcess.join(', ')}`)
  console.log(`   Total: ${allFoundAutomations.length} automation(s)`)
  console.log(`   Succeeded: ${succeeded}`)
  console.log(`   Failed: ${failed}`)

  if (failed > 0) {
    console.log(`\nFailed automations:`)
    results.filter(r => r.result === 'Failed').forEach(r => {
      console.log(`  - ${r.market}: ${r.automationName}: ${r.errorMessage}`)
    })
  }

  // Save to CSV
  const outputDir = path.join(__dirname, '../output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
  const outputPath = path.join(outputDir, `paused-automations-${timestamp}.csv`)

  writeToCSV(results, outputPath)

  console.log(`\nResults saved to: ${outputPath}`)
}

(async () => {
  await main()
})().catch(e => {
  logger.error(e.stack)

  if (e.isAxiosError && e.response?.data) {
    logger.error(JSON.stringify(e.response.data, null, 2))
  }
})
