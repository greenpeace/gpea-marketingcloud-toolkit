const path = require('path');
const puppeteer = require('puppeteer');
const logger = require('../../lib/logger');
const fs = require('fs');

let SESSION_FILE_PATH = path.join(__dirname, '../../secrets/gpokta.json')
let OKTA_URL = 'https://login.greenpeace.org/app/UserHome'

/**
 * Create a puppeteer browser
 * @returns browser
 */
async function startPuppeteerBrowser(params = {}) {
	const browser = await puppeteer.launch(Object.assign({
		// executablePath: '/usr/bin/google-chrome',
		headless: false,
		args: [
			'--no-sandbox',
			// '--disable-setuid-sandbox',
			'--disable-web-security',
			// '--disable-features=IsolateOrigins,site-per-process',
		]
	}, params));

	return browser
}

/**
 * Close the puppeteer browser
 * @param {Puppeteer.Browser} browser
 */
async function stopPuppeteerBrowser(browser) {
	if (browser) {
		browser.close()
	}
}

/**
 * Login Marketing Cloud with GPEA OKTA.
 * This action required manually input account/password for the first time login.
 * @param {Puppeteer.Page} page
 * @returns Puppeteer.Page
 */
async function executeOktaLogin(page) {
	if (fs.existsSync(SESSION_FILE_PATH)) { // Load session data from the file
		const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE_PATH, 'utf8'));
		await page.setCookie(...sessionData.cookies); // restore the session
	}

	await page.goto(OKTA_URL);

	logger.debug('Waiting to manually login')
	await page.waitForFunction(() => {
		return document.body.innerText.includes('Salesforce Marketing Cloud EA');
	}, {
		timeout: 0
	});

	// Once logged in, extract the session data
	const sessionData = {
		cookies: await page.cookies(),
	};

	// Save the session data to the file
	fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(sessionData));
	logger.info(`Session successfully saved to ${SESSION_FILE_PATH}`)

	return page
}

/**
 * Ensure to open the market specific market page
 * @param {Puppeteer.Browser} browser
 * @param {string} targetMarket TW|HK|KR
 * @returns {browser: Puppeteer.Browser, page:Puppeteer.page}
 */
async function navigateMarketSFMCHome(browser, targetMarket) {
	targetMarket = targetMarket.toUpperCase()

	if (['TW', 'HK', 'KR'].indexOf(targetMarket) < 0) {
		throw new Error(`The targetMarket must be one of TW|HK|Korea, given ${targetMarket}`)
	}
	if (targetMarket == "KR") {
		targetMarket = "Korea" // to match the SFMC BU Name
	}

	let page = await browser.newPage();

	// Login to Marketing Cloud via OKTA
	await executeOktaLogin(page);
	await page.goto(OKTA_URL);
	element = await page.waitForXPath("//*[contains(text(), 'Salesforce Marketing Cloud EA')]");
	await element.evaluate(e => e.click());
	await waitMilliSeconds(5 * 1000);

	// Switch to the new tab
	const pages = await browser.pages();

	for (const thisPage of pages) {
		const url = await thisPage.url();
		if (url.includes('exacttarget.com')) {
			page = thisPage
			logger.debug(`Switch to URL ${url}`)
		}
	}

	await page.bringToFront();
	await page.waitForNavigation()

	let url = await page.url();

	// // wait for BU menu
	logger.debug('Waiting for BU name appear')
	await page.waitForSelector('.mc-header-menu.mc-header-accounts .value');
	elements = await page.$$('.mc-account-switcher-name');
	for (const element of elements) {
		const text = await page.evaluate(el => el.textContent, element);
		if (text.includes(targetMarket)) {
			logger.debug(`Switching to BU ${text}`)
			await page.evaluate(el => el.click(), element);
			await waitMilliSeconds(3 * 1000);
		}
	}

	// wait changing BU, wait the target el contains the given text
	logger.debug('Waiting target market name shows on the menu')
	await page.waitForFunction(
		(selector, targetMarket) => {
			const element = document.querySelector(selector);
			return element && element.textContent.includes(targetMarket);
		},
		{},
		'.mc-header-menu.mc-header-accounts .value',
		targetMarket
	);

	// resole the current BizUnit name
	// await page.waitForSelector('.mc-header-menu.mc-header-accounts .value');
	element = await page.$('.mc-header-menu.mc-header-accounts .value');
	let currentBizUnitName = await page.evaluate(element => element.innerText, element);
	logger.info(`Current BU: ${currentBizUnitName}`);

	// Load CloudPages
	logger.debug('Load Cloud Page URL')
	await page.goto('https://mc.s50.exacttarget.com/cloud/#app/CloudPages/')
	await waitMilliSeconds(10 * 1000);

	return { browser, page }
}

/**
 * Issue the GET request directly from puppeteer page object
 * @param {puppeteer.Page} page The request will send from this page.
 * @param {string} url
 * @returns Object
 */
async function executeGET(page, url) {
	const cookies = await page.cookies();
	const cookieHeaders = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

	logger.info(`GET ${url}`)

	// Create a function inside the page context to send the GET request
	const result = await page.evaluate(async (url, cookies) => {
		const headers = new Headers({
			'Cookie': cookies,
		});

		const response = await fetch(url, {
			method: 'GET',
			headers: headers,
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
	}, url, cookieHeaders);

	return result
}

async function waitMilliSeconds(ms) {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

module.exports = {
	startPuppeteerBrowser,
	stopPuppeteerBrowser,
	executeOktaLogin,
	navigateMarketSFMCHome,
	executeGET,
	waitMilliSeconds
}