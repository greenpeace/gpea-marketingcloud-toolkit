const MCBase = require('../../models/MarketingCloud/Base')
const logger = require('../../lib/logger');
const _ = require("lodash")
const parser = require('cron-parser');
const differenceInDays = require('date-fns/differenceInDays')
const format = require('date-fns/format')

/**
 * Check journeys based on the rules
 * 
 * @param {MCBase} mcbase 
 * @param {array} rules [{name, cumulativePopulation, numContactsCurrentlyInJourney, numContactsAcceptedIn30Days}]
 * @returns 
 */
const check = async (mcbase, rules) => {
  // for journeys
  let mcJourney = mcbase.factory('Journey')
  let errors = []

  for (let i=0; i<rules.length; i++) {
    let rule = rules[i]

    // check should we run this check now?
    let interval = parser.parseExpression(rule.cron);
    let prevScheduled = interval.prev()
    let diffDays = differenceInDays(prevScheduled.getTime(), new Date())

    if (diffDays<=-1) {
      logger.info(`Skip *${rule.name}* with cron \`${rule.cron}\` since the prev schedule date is ${Math.abs(diffDays)} days ago (${format(prevScheduled.getTime(), "yyyy-MM-dd HH:mm:ssxxx")})`)
      continue;
    }

    try {  
      let stat = await mcJourney.getJourneyStatByName(rule.name)

      logger.debug(`Checking rule ${JSON.stringify(rule, null, 2)}`)

      let ary = ['cumulativePopulation', 'numContactsCurrentlyInJourney', 'numContactsAcceptedIn30Days']
      ary.forEach( k => {
        if (rule[k]) {
          if ( !/^[\dx><=]+$/.test(rule[k])) { // check is safe to eval
            throw new Error(`\`${rule[k]}\` is not safe. Please only use \`>\`,\`<\`,\`=\` and numbers. ex \`>=100\``)
          }

          // eval the command to see the results
          let cmd = rule[k].replace(/x/g, stat[k]) // replace the "x" placeholder with the real values
          let rs = eval(cmd)
          logger.debug(`Execute cmd for field${k}: ${cmd} = ${rs}`)

          if (rs) {
            let message = `PASS: \`${rule.name}\` pass rule \`${rule[k]}\`. \`${k}\` is \`${stat[k]}\``
            logger.debug(message)
          } else {
            let message = `:mc-journey: Journey \`${rule.name}\` should meet criterial \`${rule[k]}\`. \`${k}\` is \`${stat[k]}\``
            logger.info(message)
            errors.push({
              message: message,
              stat: stat
            })
          }
        }
      })
    } catch (e) {
      let msg = `:mc-journey:🔥 \`${rule.name}\` throw error: ${e}`
      errors.push({ message: msg})
      logger.warn(msg)
    }
    
  }
    return { errors }
}

module.exports = check