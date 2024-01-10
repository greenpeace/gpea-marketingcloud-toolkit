const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main () {
  let market = "KR"

  let mcbase = new MCBase({market})
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')

  let journeyNamesToStop = [

    'Adhoc_Reactivation Journey_230306',
    'Adhoc_Reactivation Journey_230306_TFR_test',
    '20221024_reactivation_LMS_All-lapsed_all',
    'Adhoc_Reactivation Journey_230306_SMS_test',
    'Adhoc_Reactivation Journey_230306_test',
    'KP=test-Reactivation Journey_221213',
    'test-stacy-kr_2022-new-donor-reactivation-lapsed',
    'test-stacy-Reactivation Journey_221213',
    'test-stacy-Reactivation Journey_221213',



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
