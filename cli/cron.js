const cron = require('node-cron');
const logger = require('../lib/logger');
const AllChecks = require('../models/McChecks/AllChecks')

cron.schedule('* * * * *', async () => {
  console.log('cron running', new Date())
}, {
  scheduled: true,
  timezone: "Asia/Taipei"
})

// Note. The server would treat this as UTC time. 
// 02:00 UTC = 10:00+800
// 08:00 UTC = 14:00+800
cron.schedule('0,5,10,15,20,25,30,35,40,45,50,55 17,18,19 * * *', async () => {
  console.log(`Run All Checks at ${new Date()}`)
  logger.info(`Run All Checks at ${new Date()}`)
  await AllChecks()
}, {
  scheduled: true,
  timezone: "Asia/Taipei"
});