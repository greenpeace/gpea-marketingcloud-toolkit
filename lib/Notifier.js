const axios = require('axios');
const logger = require('./logger');
const _ = require("lodash")
require('dotenv').config()

const Notifier = {

  sendToSlack: async (message) => {
    let url = process.env.SLACK_WEBHOOK
    let response = await axios.post(url, {
      "text": message
    })
  },

  sendMarkdownToSlack: async (message) => {
    let url = process.env.SLACK_WEBHOOK
    let response = await axios.post(url, {
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": message
          }
        }
      ]
    })
  }

  
}

module.exports = Notifier
