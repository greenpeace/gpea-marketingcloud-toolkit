const path = require('path');
const FTPS = require('ftps')

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
  if (!icalRecurString) {
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

// copied from https://github.com/greenpeace/gpea-npm-en-uploader/blob/master/upload_folder.js
/**
 * Use lftp to sync local dir to remote
 *
 * @param  {object} settings {host:string, port:number, username:string, password:string}
 * @param  {string} localDir Local folder to update
 * @param  {string} remoteDir The remote path to upload. If it's not exist, it will be created.
 */
async function syncFolder (settings, localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    // @see https://github.com/Atinux/node-ftps for arguments
  var ftps = new FTPS(settings)

  console.info(
    `Sync from \`${localDir}\` to \`${settings.protocol}://${settings.username}@${settings.host}:${remoteDir}\``
  )

  ftps
    .mirror({
      localDir: localDir,
      remoteDir: remoteDir,
      upload: true,
    })
    .cd(remoteDir)
    .ls()
    .exec(function (err, res) {
      // err will be null (to respect async convention)
      // res is an hash with { error: stderr || null, data: stdout }
      if (err) {
        console.error(err)
        reject(err)
      } else {
        console.info('Successfully uploaded.')
        console.info(res.data)
        resolve(res)
      }
    })
  })
}



module.exports = {
  rruleToHumanReadable,
  syncFolder
};