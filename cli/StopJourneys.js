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
    'hk-oneoff_conversion-automd-sg2rg-lantau-documentary-movie-20220629_in_other_journey',
    'hk-oneoff_conversion-automd-sg2rg-lantau-documentary-movie-20220629_for_missing_lc',
    'hk-oneoff_conversion-automd-sg2rg-lantau-documentary-movie-20220517',
    'hk-oneoff_conversion-automd-sg2rg-lantau-documentary-movie-20220607',
    'hk-oneoff_conversion-automd-sg2rg-lantau-documentary-movie-20220726_for_passcode_donor_lc',
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
