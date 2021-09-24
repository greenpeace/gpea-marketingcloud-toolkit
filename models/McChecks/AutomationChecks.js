
const logger = require('../../lib/logger');
const _ = require("lodash")

// return {errors: [string, string, ....]}
const check = async (mcbase) => {
  let mcAutomation = mcbase.factory('Automation')
  logger.debug("Retrieving all the automations ...")
  let automations = await mcAutomation.findBy({ field: "IsActive", value: "true" })

  // start to check
  let errors = []
  automations.forEach(a => {
    // 1. All the automation with `automd` should have schedule time
    // This is to prevent someone accidently stop the schedule
    if (a.Name.indexOf('automd')>=0 && a.Status!=='6') {
      let message = `:mc-automation: Automation \`${a.Name}\` should have a schedule activated.`

      logger.info(message)
      errors.push({
        message: message,
        automation: a
      })
    }
  })

  return {errors}
}

module.exports = check