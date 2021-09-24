const cron = require('node-cron');
const logger = require('../lib/logger');
const AllChecks = require('../models/McChecks/AllChecks')

cron.schedule('*/10 * * * *', async () => {
  console.log('cron running', new Date())
}, {
  scheduled: true,
  timezone: "Asia/Taipei"
})

// Note. The server would treat this as UTC time. 
// 02:00 UTC = 10:00+800
// 08:00 UTC = 14:00+800
cron.schedule('0 10,16 * * *', async () => {
  console.log(`Run All Checks at ${new Date()}`)
  await AllChecks()
}, {
  scheduled: true,
  timezone: "Asia/Taipei"
});