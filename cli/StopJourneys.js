const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main () {
  let market = "HK"

  let mcbase = new MCBase({market})
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')

  let journeyNamesToStop = [
    'hk-annual_reactivation-adhoc-20220930',
'hk-annual_upgrade-adhoc-20221130-2023_q1-chinese-thank_you_after_case_outcome',
'hk-annual_upgrade-adhoc-20221130-2023_q1-chinese_batch1_fix_call_case',
'hk-annual_upgrade-adhoc-20221130-2023_q1-chinese_batch2_Jan',
'hk-annual_upgrade-adhoc-20221130-2023_q1-chinese_batch3_Feb',
'hk-annual_upgrade-adhoc-20221130-2023_q1-chinese_batch4_Mar',
'hk-annual_upgrade-adhoc-20221206-2023_q1_group2-chinese_batch1',
'hk-annual_upgrade-adhoc-20221206-2023_q1_group2-chinese_batch2',
'hk-annual_upgrade-adhoc-20221206-2023_q1_group2-chinese_batch3',
'hk-annual_upgrade-adhoc-20221208-2023_q1-eng',
'hk-sms-adhoc-20220817-ebull-annual-report-webinar-sms-1',
'hk-sms-adhoc-20220818-enews-annual-report-webinar-sms-1',
'hk-sms-adhoc-20220826-enews-annual-report-webinar-sms-2',
  ]

  for (let i = 0; i < journeyNamesToStop.length; i++) {
    const jName = journeyNamesToStop[i];

    let r = await mcJourney.findByName(jName, {mostRecentVersionOnly: false})

    // let jDefinitionId = _.get(journey, 'items.0.definitionId')

    if (r.items.length) {
      let publishedJourneyVersion = r.items.find(oneVerJourney => {
        return oneVerJourney.status==='Published'
      })

      if ( !publishedJourneyVersion) {
        console.info(`${jName} doesn't have active an version. Skip.`)
      } else {
        // console.log(publishedJourneyVersion)
        let jId = _.get(publishedJourneyVersion, 'id')
        let version = _.get(publishedJourneyVersion, 'version')
        let stopResult = await mcJourney.stop(jId, {versionNumber: version})
        console.log(`${jName} v${version} is going to stop.`, 'result', stopResult)
      }
    } else {
      console.warn(`${jName} not found`)
    }
  }
}


(async () => {
  var text = await main();
})().catch(e => {
  logger.error(e.stack)

  if (e.isAxiosError) {
    console.error(e)

    if (e.response.data) {
      logger.error(JSON.stringify(e.response.data,null,2))
    }
  }
});
