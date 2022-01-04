const logger = require('../../lib/logger');
const _ = require("lodash")

// return {errors: [string, string, ....]}
const check = async (mcbase) => {
  let mcJourney = mcbase.factory('Journey')
  let mcSend = mcbase.factory('Send')

  let daysToCheck = 2
  logger.debug(`Retrieving failed Single Sends in last ${daysToCheck} days ...`)
  let r = await mcSend.getSends(daysToCheck)

  // start to check
  let errors = []
  r.forEach(a => {
    if (['Complete', 'Scheduled', 'Sending'].indexOf(a.Status) < 0) {
      let message = `:mc-send: Email \`${_.trim(a.EmailName)}\` *${a.Status}*. (SendDate: ${a.SentDate} Title: ${_.trim(a.Subject)} )`

      logger.info(message)
      errors.push({
        message: message,
        send: a
      })
    }
  })

  return {errors}
}

module.exports = check