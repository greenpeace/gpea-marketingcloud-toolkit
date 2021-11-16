const cron = require('node-cron');
const logger = require('../lib/logger');
const AllChecks = require('../models/McChecks/AllChecks')

async function main () {
  await AllChecks()
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
