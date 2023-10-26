const axios = require('axios');
const logger = require('../../lib/logger');
const _ = require("lodash")
const fs = require("fs")
const path = require('path');

const { startPuppeteerBrowser,
	stopPuppeteerBrowser,
	executeOktaLogin,
	navigateMarketSFMCHome,
	executeGET,
	waitMilliSeconds } = require('../Utils/PuppeteerTools')


/**
 * Since Marketing Cloud doesn't support CloudPage APIs, these features are done by puppetter directly access the pages
 */
class CloudPage {
	async getCollections() {
		let browser = await startPuppeteerBrowser()
		let { page } = await navigateMarketSFMCHome(browser, this.parent.market)

		// Get cookies from the page
		logger.debug('Fetching Collections')
		try {
			let collectionRs = await executeGET(page, 'https://cloud-pages.s50.marketingcloudapps.com/fuelapi/internal/v2/cloudpages/collections?$page=1&$pageSize=25&$orderBy=createdDate%20DESC')
			let collections = collectionRs.entities // [{ "collectionId": number, "name": string, "thumbnailDataUri": string, "createdDate": "2023-07-14T01:37:02Z", "modifiedDate": "2023-07-14T01:37:02Z" }, ...]
			await stopPuppeteerBrowser(browser)
			return collections
		} catch (error) {
			await waitMilliSeconds(1000*60)
			await stopPuppeteerBrowser(browser)
		}
	}

	async getCloudPages() {
		let browser = await startPuppeteerBrowser()
		let { page } = await navigateMarketSFMCHome(browser, this.parent.market)

		logger.debug('Fetching Pages')
		let pagesRs = await executeGET(page, 'https://cloud-pages.s50.marketingcloudapps.com/fuelapi/internal/v2/cloudpages/landing-pages?pageTypeId=3&$page=1&$pageSize=1000&$orderBy=createdDate%20DESC')
		let cloudPages = pagesRs.entities // {"publishDate": string, "landingPageId": number, "pageId": number, "key": string, "isNoIndex": boolean, "isNoFollow": boolean, "pageTypeId": number, "collectionId": number, "itemId": number, "name": string, "description": string, "domain": string, "requiresSsl": boolean, "url": string, "createdDate": string, "modifiedDate": string, "status": string, "timeZoneId": number },
		await stopPuppeteerBrowser(browser)

		return cloudPages
	}
}

module.exports = CloudPage