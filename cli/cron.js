const cron = require('node-cron');
const logger = require('../lib/logger');
const AllChecks = require('../models/McChecks/AllChecks')

cron.schedule('* * * * *', async () => {
  console.log('cron running', new Date())
})

cron.schedule('0 10,16 * * *', async () => {
  logger.info(`Run All Checks at ${new Date()}`)
  await AllChecks()
});