const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')


/**
 */
class KRUtils {
  generate1ClickOneoffLink({contactId, campaignId}) {
    if ( !contactId) {
      throw new Error("contactId is required.")
    }

    const urlObj = new URL('https://cloud.greensk.greenpeace.org/oneclickbitly')

    // add contactId
    urlObj.searchParams.append("id", Buffer.from(contactId).toString('base64'));

    // add campaignId
    if (campaignId) {
      urlObj.searchParams.append("cm", campaignId);  
    }
    
    return urlObj.href
  }
}

module.exports = KRUtils