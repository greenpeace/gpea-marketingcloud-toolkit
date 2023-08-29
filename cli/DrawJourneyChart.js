const MCBase = require('../models/MarketingCloud/Base')
const JourneyFlowExport = require('../models/MarketingCloud/JourneyFlowExport/JourneyFlowExport.js')
const logger = require('../lib/logger');
const fs = require('fs')

require('dotenv').config()

async function main() {
	// EDIT HERE
	const srcJourneyName = "kr-debit_fail-credit_card-automd"
	const market = "kr"

	let mcbase = new MCBase({ market })

	await mcbase.doAuth()
	let mcJourney = mcbase.factory('Journey')
	let mcJB = mcbase.factory('JourneyBuilder')

	logger.info(`Fetching journey ${srcJourneyName} details`)
	let srcJ = await mcJB.loadSrcJourneyName(srcJourneyName)

	fs.writeFileSync(`${srcJourneyName}.json`, JSON.stringify(srcJ, null, 2))

	let jFlowExport = new JourneyFlowExport(srcJ)
	jFlowExport.withIcons = true
	jFlowExport.removeUnimportantNodes = true

	logger.info(`Generating journey markdown ...`)
	let markdown = jFlowExport.exportMarkdown()
	logger.debug(markdown)

	logger.info(`Generating journey HTML ...`)
	let html = jFlowExport.exportHTML()
	let outputPath = `${srcJourneyName}.html`
	fs.writeFileSync(outputPath, html, 'utf8');
	logger.info(`Exported HTML to file ${outputPath}`)
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
