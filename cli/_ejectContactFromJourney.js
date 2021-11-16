const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main () {
  let mcbase = new MCBase({
    clientId: process.env.MC_HK_CLIENTID,
    clientSecret: process.env.MC_HK_CLIENTSECRET,
    subDomain: process.env.MC_HK_SUBDOMAIN,
    accountId: process.env.MC_HK_ACCOUNTID,
  })
  await mcbase.doAuth()

  let mcJourney = mcbase.factory('Journey')
  let mcAutomation = mcbase.factory('Automation')

  let jName = "hk-oneoff_conversion-automd-2021_special_sg2rg-20211020"
  // let contactKey = "0032u00000DpaTkAAJ"
  let contactKeys = ['0032u00000VshiyAAB', '0032u00000VtGHAAA3', '0032u00000VtIHGAA3', '0032u00000VtnVCAAZ', '0032u00000VtstBAAR', '0032u00000Vu0HKAAZ', '0032u00000VypONAAZ', '0032u00000VztgaAAB', '0032u00000VztjzAAB', '0032u00000VztMCAAZ', '0032u00000W03yIAAR', '0032u00000Wa0NGAAZ', '0032u00000Wa3r7AAB', '0032u00000Wa51NAAR', '0032u00000Wa5aiAAB', '0032u00000Wa5N9AAJ', '0032u00000Wa6NAAAZ', '0032u00000WaCQrAAN', '0032u00000WaERqAAN', '0032u00000WaF40AAF', '0032u00000WYvXHAA1', '0032u00000WZH69AAH', '0032u00000WZhvjAAD', '0032u00000WZhYaAAL', '0032u00000WZl8uAAD', '0032u00000WZlCDAA1', '0032u00000WZlDGAA1', '0032u00000WZlDHAA1', '0032u00000WZlETAA1', '0032u00000WZlF2AAL', '0032u00000WZm2xAAD', '0032u00000WZOEcAAP', '0032u00000WZohuAAD', '0032u00000WZp7xAAD', '0032u00000WZrRjAAL', '0032u00000WZve2AAD', '0032u00000WZvnsAAD', '0032u00000WZvNVAA1', '0032u00000WZx8ZAAT', '0032u00000WZxbsAAD', '0032u00000WZxnyAAD', '0032u00000WZYpSAAX', '0032u00000WZzjPAAT', '0032u00000WZzoZAAT', '0032u00000WZZPFAA5', '0032u00000WZzpNAAT', '0032u00000XCGGtAAP', '0032u00000XCHi9AAH', '0032u00000XCIAiAAP', '0032u00000XCK4QAAX', '0032u00000XCQoiAAH', '0032u00000XCQVJAA5', '0032u00000XCRS8AAP', '0032u00000EbG3XAAV', '0032u00000EctaCAAR', '0032u00000EdGZwAAN', '0032u00000Edj71AAB', '0032u00000EduJbAAJ', '0032u00000EeC2cAAF', '0032u00000F8BPEAA3', '0032u00000F9IkJAAV', '0032u00000F9T7qAAF', '0032u00000F9W3BAAV', '0032u00000FA9OKAA1', '0032u00000FAFLCAA5', '0032u00000FAFlsAAH', '0032u00000FAGicAAH', '0032u00000FAHoOAAX', '0032u00000FAkYzAAL', '0032u00000FAoIeAAL', '0032u00000FBIDWAA5', '0032u00000GLxHQAA1', '0032u00000LyokhAAB', '0032u00000Mr9AxAAJ', '0032u00000MsK5gAAF', '0032u00000MtujjAAB', '0032u00000RBX5dAAH', '0032u00000RD0QyAAL', '0032u00000SfdEiAAJ', '0032u00000SfZ4uAAF', '0032u00000SiUJDAA3', '0032u00000Tfb1iAAB', '0032u00000Wa01EAAR', '0032u00000Wa0swAAB', '0032u00000Wa0wAAAR', '0032u00000Wa1hqAAB', '0032u00000Wa20dAAB', '0032u00000Wa2uAAAR', '0032u00000Wa31lAAB', '0032u00000Wa3gxAAB', '0032u00000Wa62HAAR', '0032u00000Wa62MAAR', '0032u00000Wa6i8AAB', '0032u00000Wa72DAAR', '0032u00000Wa90yAAB', '0032u00000Wa9GXAAZ', '0032u00000WaAbCAAV', '0032u00000WaBZQAA3', '0032u00000WaCigAAF', '0032u00000WaDCCAA3', '0032u00000WaDKLAA3', '0032u00000WaExnAAF', '0032u00000WaEy7AAF', '0032u00000WaFvaAAF', '0032u00000WaGI9AAN', '0032u00000WaIqIAAV', '0032u00000WaIsKAAV', '0032u00000WaJB6AAN', '0032u00000WXQJIAA5', '0032u00000WYaYyAAL', '0032u00000WZhmSAAT', '0032u00000WZiKkAAL', '0032u00000WZo6iAAD', '0032u00000WZotCAAT', '0032u00000WZqK9AAL', '0032u00000WZQuPAAX', '0032u00000WZr4ZAAT', '0032u00000WZvbNAAT', '0032u00000WZxWYAA1', '0032u00000WZy4GAAT', '0032u00000WZzcdAAD', '0032u00000WZzd7AAD', '0032u00000XC5doAAD', '0032u00000XC5XqAAL', '0032u00000XCFAQAA5', '0032u00000XCGA1AAP', '0032u00000XCH2lAAH', '0032u00000XCHgwAAH', '0032u00000XCI5nAAH', '0032u00000XCJW9AAP', '0032u00000XCMQYAA5', '0032u00000XCNshAAH', '0032u00000XCO36AAH', '0032u00000XCODzAAP', '0032u00000XCPBtAAP', '0032u00000XCQ2kAAH', '0032u00000XCQc8AAH', '0032u00000XCQs2AAH',]

  let j = await mcJourney.findByName(jName)
  console.log('j', j)

  let jKey = _.get(j, 'items.0.key')
  console.log('jKey', jKey)

  for (let i = 0; i < contactKeys.length; i++) {
    const contactKey = contactKeys[i];
    logger.info(`Ejecting contactId ${contactKey} from journey ${jName}`)
    let r = await mcJourney.ejectContact(jKey, contactKey)
    console.log(r)
  }

  let stat = await mcJourney.getJourneyStatByName(jName)
  delete stat.journey
  console.log('stat', stat)

  // let journeyName = "tw-utils-adhoc-20210927-up_test_ga_tracking"
  // let res = await mcJourney.findByName(journeyName)
  // let journeyId = _.get(res, "items.0.id")
  // console.log("Use definition Id", journeyId)

  // // let journeyId = "9b273ffd-0805-44e0-a9e5-f9365ade5738"
  // res = await mcJourney.pause(journeyId, {
  //   ExtendWaitEndDates: true,
  //   PausedDays: 14,
  //   GuardrailAction: "Stop",
  //   RetainContactInjectionWhileJourneyPaused: true,
  //   AllVersions: true
  // })

  // let found = await mcAutomation.findBy({field: "Name", value:"hk-dd_followup-automd - 2021-06-22T213611.882"})
  // console.log('found', found)
  // if (found) {
  //   logger.warn(`Start to delete ${found["CustomerKey"]}`)
  //   let rs = await mcAutomation.delete(found["CustomerKey"])
  //   // let rs = await mcAutomation.delete("746b37c6-4568-4a6b-ba8a-36f2bed62e42")
  //   console.log('rs', rs)
  // }


  // console.log(res)s

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
