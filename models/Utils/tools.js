const { RRule } = require('rrule');

/**
 * Function to convert iCalendar RRule string into human-readable format
 * @param {string} icalRecurString - The iCalendar RRule string to convert
 *
 * @returns {string} The human-readable representation of the RRule string
 *
 * @example
 * // returns "Every 1 month on day 28"
 * rruleToHumanReadable("FREQ=MONTHLY;UNTIL=20790606T140000;INTERVAL=1;BYMONTHDAY=28");
 *
 * @example
 * // returns "Every 2 weeks on day 1,4"
 * rruleToHumanReadable("FREQ=WEEKLY;UNTIL=20790606T140000;INTERVAL=2;BYDAY=MO,TH");
 */
function rruleToHumanReadable(icalRecurString) {
	if ( !icalRecurString) {
		return
	}

	const rrule = RRule.fromString(icalRecurString);

  const options = rrule.origOptions;
  let text = '';

  // Frequency
  switch (options.freq) {
    case RRule.MONTHLY:
      text += `Every ${options.interval} month`;
      break;
    case RRule.WEEKLY:
      text += `Every ${options.interval} week`;
      break;
    case RRule.DAILY:
      text += `Every ${options.interval} day`;
      break;
    default:
      text += `Unsupported frequency: ${options.freq}`;
      break;
  }

  // Day of the month
  if (options.bymonthday) {
    text += ` on day ${options.bymonthday}`;
  }

  return text;
}

module.exports = {
  rruleToHumanReadable
};