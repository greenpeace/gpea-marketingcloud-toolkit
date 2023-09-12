// Mailgun services
const axios = require('axios')

class Mailgun {
	constructor ({domain, apiKey}) {
		this.domain = domain
		this.apiKey = apiKey
	}

	_generateAuthHeader () {
		const headers = {
      Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
    };

		return headers
	}

	/**
	 * Fetch all the stored emails from mailgun
	 * @returns StoredEmailResponse @see Mailgun.d.ts
	 */
	async getStortedEmails () {
		const headers = this._generateAuthHeader()
		let items = []

		let nextURL = `https://api.mailgun.net/v3/${this.domain}/events`
		let pageNo = 0
		while (nextURL) {
			console.debug(`fetching page ${pageNo}`, nextURL)
			let response = await axios.get(nextURL, { headers })

			// console.log('response.data', response.data)

			// console.log(`https://api.mailgun.net/v3/${domain}/events`)
			if (response.data.items && response.data.items.length) {
				items = [...items, ...response.data.items]
				nextURL = response.data.paging.next // fetch next page
				pageNo += 1
			} else {
				break // no more data available
			}
		}

		// console.log(items)
		return items
	}

	/**
	 * Fetch stored email details
	 * @param {string} storedKey
	 * @returns StoredEmail @see type definitions
	 */
	async getStoredEmail (storageKey) {
		let headers = this._generateAuthHeader()
		let response = await axios.get(`https://api.mailgun.net/v3/domains/${this.domain}/messages/${storageKey}`, {headers})
		return response.data
	}
}

module.exports = Mailgun