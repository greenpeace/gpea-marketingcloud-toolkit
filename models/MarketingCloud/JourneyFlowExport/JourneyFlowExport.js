const fs = require('fs');
const path = require('path');
const logger = require('../../../lib/logger');

class JourneyFlowExport {
	constructor (srcJ=null) {
		this.srcJ = srcJ ? srcJ : null
		this.withIcons = true
		this.removeUnimportantNodes = true
	}

	loadJourneySrc (srcJ) {
		this.srcJ = srcJ

		// validate step
		if (this.srcJ.activities===undefined) {
			throw new Error("The srcJ formate should be {activities:[...]}")
		}
	}

	_getJourneyName () {
		return this.srcJ.name
	}


	_resolveActMermaidKey (act) {
		return act.key
	}

	/**
	 * Determine the next node of current node. Given an outcome object
	 * @param {Object} anOutcome
	 * @returns string
	 */
	_resolveOutcomeMermaidKey (anOutcome) {
		return anOutcome.next
	}

	/**
	 * Determine the link desc text
	 * @param {Object} anOutcome
	 * @returns string
	 */
	_resolveOutcomeMermaidPathText (anOutcome) {
		let desc = ''
		if (anOutcome.metaData?.label) {
			desc += anOutcome.metaData.label
		}

		return desc
	}
	/**
	 * Deteremine the node display name
	 * @param {Object} act
	 * @returns string
	 */
	_resolveActMermaidName (act) {
		let iconMap = {
			"UPDATECONTACTDATA": 'fa:fa-database',
			"SALESCLOUDACTIVITY": 'fa:fa-suitcase',
			"WAIT": 'fa:fa-clock',
			"MULTICRITERIADECISION": 'fa:fa-question',
			"STOWAIT": 'fa:fa-clock',
			"EMAILV2": 'fa:fa-envelope',
			"Case": 'fa:fa-suitcase',
			"SMSSYNC": 'fa:fa-sms'
		}

		let name = ''
		if (this.withIcons && iconMap[act.type]) {
			name = iconMap[act.type] + " "
		}

		if (act.type === "MULTICRITERIADECISION") {
			name += act.name || "DecisionSplit"
		} else if (act.type === "STOWAIT") {
			name += act.name || "Send Time Optimize"
		} else {
			name += (act.name || "NO_NAME")
		}

		return name
	}

	/**
	 * Deteremine the node shape based on the activity types
	 * @param {Object} act
	 * @returns string
	 */
	_resolveActParentheses (act) {
		if (act.type === "MULTICRITERIADECISION") {
			return ['{', '}']
		} else if (act.type === "EMAILV2" || act.type === "SMSSYNC") {
			return ['>', ']']
		} else {
			return ['[', ']']
		}
	}

	/**
	 * Determine the css className of this activity
	 * @param {Object} act
	 * @returns string
	 */
	_resolveActNodeClassname (act) {
		let name

		if (act.type==="EMAILV2"
			|| act.type==="SMSSYNC"
			|| act.type==="SALESCLOUDACTIVITY"
		) {
			name = "is-communication"
		}

		return name
	}

	/**
	 * Remove the un-important nodes. Includes:
	 * - IN_JOURNEY
	 * - CREATE_CONTACTJOURNEY
	 * @param {Array} activities
	 * @returns
	 */
	_removeShouldBeHideActivities (activities) {
		// collect nodes which should not be shown in the exported charts
		let { excluded, remainders } = activities.reduce((groups, act) => {
			if (act.metaData.expressionBuilderPrefix === "Contact Journey") {
				groups.excluded.push(act);
			} else if (act.type === 'UPDATECONTACTDATA') {
				groups.excluded.push(act);
			} else {
				groups.remainders.push(act);
			}
			return groups;
		}, { excluded: [], remainders: [] });

		const excludedActsMap = {}
		for (const act of excluded) {
			if (act && act.key) {
				excludedActsMap[act.key] = act;
			}
		}

		remainders.forEach((act, i) => {
			act.outcomes?.forEach((anOutcome, j) => {
				let nextKey = anOutcome.next
				while (excludedActsMap[nextKey]) { // traverse to the first no in the excluded array
					nextKey = excludedActsMap[nextKey].outcomes[0].next
				}

				anOutcome.next = nextKey
			})
		})

		return remainders
	}

	/**
	 * Convert the srcJ to a mermaid markdown
	 * @returns string
	 */
	exportMarkdown () {
		let markdown = ""

		markdown +=`---\ntitle: ${this._getJourneyName()}\n---\n`
		markdown += "%%{ init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#F8F0E5', 'secondaryColor': '#EADBC8', 'lineColor': '#AAA' } } }%%\n"
		markdown += "flowchart LR\n"
		markdown += "classDef is-communication fill:#102C57, color: #FFF\n"

		let activities = this.srcJ.activities

		if (this.removeUnimportantNodes) {
			activities = this._removeShouldBeHideActivities(activities)
		}

		// resolve the node definitions
		activities.forEach(anAct => {
			let actKey = this._resolveActMermaidKey(anAct)
			let actName = this._resolveActMermaidName(anAct)
			let parentheses = this._resolveActParentheses(anAct)
			let className = this._resolveActNodeClassname(anAct)
			markdown += `\t${actKey}${parentheses[0]}"${actName}"${parentheses[1]}${className? ":::"+className:""}\n`
		});

		// connect nodes
		activities.forEach(anAct => {
			let actKey = this._resolveActMermaidKey(anAct)

			anAct.outcomes?.forEach(anOutcome => {
				let outcomeKey = this._resolveOutcomeMermaidKey(anOutcome)
				let outcomeDesc = this._resolveOutcomeMermaidPathText(anOutcome)

				if (!outcomeKey) {
					return
				}

				if (outcomeDesc && outcomeDesc !== "") {
					markdown += `\t${actKey} -->|"${outcomeDesc}"|${outcomeKey}\n`
				} else {
					markdown += `\t${actKey} --> ${outcomeKey}\n`
				}
			})
		});

		return markdown
	}

	/**
	 * Convert the srcJ to a HTML string which can directly opended by a browser.
	 * @returns string
	 */
	exportHTML () {
		let markdown = this.exportMarkdown()

		const tmplPath = path.join(path.dirname(__filename), 'JourneyFlowTMPL.html');
		let htmlContent = fs.readFileSync(tmplPath, 'utf8');

		htmlContent = htmlContent.replace('_MERMAID_TITLE_', this._getJourneyName());
		htmlContent = htmlContent.replace('_MERMAID_CONTENT_', markdown);

		return htmlContent;
	}
}

module.exports = JourneyFlowExport