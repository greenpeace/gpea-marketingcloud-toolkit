const MCBase = require('../models/MarketingCloud/Base')
const fs = require('fs');
const logger = require('../lib/logger');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function main() {
	let markets = ['TW', 'HK', 'KR']

	const csvHeaders = [
		{ id: 'market', title: 'Market' },
		{ id: 'collectionName', title: 'Collection Name' },
		{ id: 'name', title: 'Page Name' },
		{ id: 'pageId', title: 'Page Id' },
		{ id: 'url', title: 'Page URL' },
		{ id: 'status', title: 'Status' },
		{ id: 'createdDate', title: 'createdDate' },
		{ id: 'modifiedDate', title: 'modifiedDate' },
	];
	const csvWriter = createCsvWriter({
		path: 'CloudPages.csv', // Specify the file path where you want to save the CSV
		header: csvHeaders,
	});

	for (let i = 0; i < markets.length; i++) {
		const market = markets[i];

		let mcbase = new MCBase({ market })
		await mcbase.doAuth()

		let mcCloudPage = mcbase.factory('CloudPage')

		let collections = await mcCloudPage.getCollections()
		fs.writeFileSync('collections.json', JSON.stringify(collections, null, 2))
		let pages = await mcCloudPage.getCloudPages()
		fs.writeFileSync('pages.json', JSON.stringify(pages, null, 2))

		// build collection map
		let collectionMap = collections.reduce((acc, collection) => {
			acc[collection.collectionId] = collection
			return acc
		}, {})

		logger.info("Writing to CSV ...")
		// process each page to fit the csv format
		pages.forEach(page => {
			page.collectionName = collectionMap[page.collectionId].name
			page.market = market
		});

		csvWriter.writeRecords(pages)
	}

	// convert into CSVs

	logger.info("DONE")
}

(async () => {
	var text = await main();
})().catch(e => {
	logger.error(e.stack)

	if (e.isAxiosError) {
		console.error(e)

		if (e.response.data) {
			logger.error(JSON.stringify(e.response.data, null, 2))
		}
	}
});