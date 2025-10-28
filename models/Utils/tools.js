const path = require('path');
const FTPS = require('ftps')
const axios = require('axios')
const fs = require('fs')
const { RRule } = require('rrule');
const { google } = require('googleapis');


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
    case RRule.YEARLY:
      text += `Every ${options.interval} year`;
      break;
    case RRule.MONTHLY:
      text += `Every ${options.interval} month`;
      break;
    case RRule.WEEKLY:
      text += `Every ${options.interval} week`;
      break;
    case RRule.DAILY:
      text += `Every ${options.interval} day`;
      break;
    case RRule.HOURLY:
      text += `Every ${options.interval} hour`;
      break;
    case RRule.MINUTELY:
      text += `Every ${options.interval} minute`;
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
async function syncFolder(settings, localDir, remoteDir) {
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function shortenUrl(longUrl) {
  const accessToken = process.env.BITLY_TOKEN;
  const headers = {
    "Content-Type": "application/json",
    Authorization: accessToken
  };
  const payload = {
    long_url: longUrl
  };


  // Define cache file path
  const cacheFilePath = path.join(__dirname, '../../shortenUrl-cache.json');

  try {
    // Check if cache file exists
    let cache = {};
    try {
      const cacheData = fs.readFileSync(cacheFilePath, 'utf8');
      cache = JSON.parse(cacheData);
    } catch (readError) {
      if (readError.code !== 'ENOENT') {
        console.error('Error reading cache file:', readError);
      }
    }

    // Check if URL is already in cache
    if (cache[longUrl]) {
      return cache[longUrl];
    }

    const response = await axios.post("https://api-ssl.bitly.com/v4/shorten", payload, { headers });
    const bitlyUrl = response.data.id;
    const shortenUrl = `https://${bitlyUrl}`;

    // Save shortened URL to cache
    cache[longUrl] = shortenUrl;
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2));

    return shortenUrl;
  } catch (error) {
    console.error(error);
    throw error
  }
}


/**
 * Generate the google auth file.
 * @returns Gooel Auth Client
 */
function getGoogleAuthorize() {
  // Replace with your own credentials JSON file
  const credentialsPath = path.join(__dirname, '../../secrets/gpea-syncer@gpea-engage.iam.gserviceaccount.com.json');
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));

  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

  const { client_email, private_key } = credentials;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes: SCOPES,
  });

  return auth.getClient();
}

module.exports = {
  rruleToHumanReadable,
  syncFolder,
  sleep,
  shortenUrl,
  getGoogleAuthorize
};