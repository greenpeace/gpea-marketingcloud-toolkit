const MCBase = require('../models/MarketingCloud/Base')
const JourneyFlowExport = require('../models/MarketingCloud/JourneyFlowExport/JourneyFlowExport.js')
const logger = require('../lib/logger');
const _ = require("lodash")
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { rruleToHumanReadable } = require('../models/Utils/tools.js')
const cliProgress = require('cli-progress');
const fs = require('fs')
const path = require('path');
const { syncFolder } = require('../models/Utils/tools.js')
const Mailgun = require('../models/Mailgun')
const { format, subDays, addDays, isAfter } = require('date-fns');
const { sleep, shortenUrl, getGoogleAuthorize } = require('../models/Utils/tools')
const { google } = require('googleapis');
const csv = require('csv-parser');

require('dotenv').config()

/**
 * The doc should contains
 *
 * 1. Entry Criteria (if its in triggerd mode)
 * 2. Entry SQL and its's scheduled time (if its from automation)
 * 3. OK Call Case Details
 *       Subject, Category, Sub Category, case Originm Campaign
 * 4. OK Call Case generated time (min-max), maybe multiple
 * 5. Journey Emails and SMS previews
 *
 */

// Cache setup for journey data
const CACHE_DIR = path.join(__dirname, '../.cache');
const CACHE_EXPIRY_DAYS = 7;

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Get current memory usage information
 * @returns {Object} Memory usage statistics
 */
function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  return {
    rss: Math.round(memUsage.rss / (1024 * 1024)),      // Resident Set Size in MB
    heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)),  // Total size of the allocated heap in MB
    heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)),   // Actual memory used in MB
    external: Math.round(memUsage.external / (1024 * 1024)),   // Memory used by C++ objects bound to JavaScript objects in MB
  };
}

/**
 * Log memory usage
 */
function logMemoryUsage() {
  const memory = getMemoryUsage();
  console.log(`
┌────────────────────────────────────────────┐
│            🧠 Memory Usage                  │
├────────────────────────────────────────────┤
│  🔍 RSS:             ${memory.rss.toString().padStart(6)} MB              │
│  📊 Heap Total:      ${memory.heapTotal.toString().padStart(6)} MB              │
│  📈 Heap Used:       ${memory.heapUsed.toString().padStart(6)} MB              │
│  🔌 External:        ${memory.external.toString().padStart(6)} MB              │
└────────────────────────────────────────────┘
  `);
}

// Cache statistics
const cacheStats = {
  hits: 0,
  misses: 0,
  get total() {
    return this.hits + this.misses;
  },
  get hitRatio() {
    return this.total === 0 ? 0 : this.hits / this.total;
  }
};

/**
 * Clean expired cache files
 */
function cleanupExpiredCache() {
  try {
    console.log('🧹 Starting cache cleanup process...');
    const files = fs.readdirSync(CACHE_DIR);
    let expiredCount = 0;
    let totalFiles = 0;
    
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      if (file.endsWith('.json')) {
        totalFiles++;
        try {
          const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (isAfter(new Date(), new Date(cacheData.expiresAt))) {
            fs.unlinkSync(filePath);
            expiredCount++;
          }
        } catch (err) {
          // If the file can't be read or isn't valid JSON, remove it
          fs.unlinkSync(filePath);
          expiredCount++;
        }
      }
    });
    
    const keepCount = totalFiles - expiredCount;
    console.log(`
┌────────────────────────────────────────────┐
│            🧹 Cache Cleanup                 │
├────────────────────────────────────────────┤
│  📂 Total cache files:   ${totalFiles.toString().padStart(6)}               │
│  🗑️  Removed files:       ${expiredCount.toString().padStart(6)}               │
│  📋 Remaining files:     ${keepCount.toString().padStart(6)}               │
└────────────────────────────────────────────┘
    `);
    
    logger.info(`Cache cleanup: ${expiredCount} expired files removed, ${keepCount} files kept.`);
  } catch (error) {
    logger.error(`Error cleaning up cache: ${error.message}`);
  }
}

/**
 * Log cache statistics
 */
function logCacheStats() {
  const hitRatio = (cacheStats.hitRatio * 100).toFixed(2);
  const hitColor = hitRatio >= 70 ? '\x1b[32m' : (hitRatio >= 40 ? '\x1b[33m' : '\x1b[31m');
  const resetColor = '\x1b[0m';
  
  console.log(`
┌────────────────────────────────────────────┐
│            📦 Cache Statistics             │
├────────────────────────────────────────────┤
│  🔍 Cache Queries:     ${cacheStats.total.toString().padStart(6)}               │
│  ✅ Cache Hits:        ${cacheStats.hits.toString().padStart(6)}               │
│  ❌ Cache Misses:      ${cacheStats.misses.toString().padStart(6)}               │
│  📊 Hit Ratio:         ${hitColor}${hitRatio.padStart(6)}%${resetColor}             │
└────────────────────────────────────────────┘
  `);
  
  logger.info(`Cache statistics: Hits: ${cacheStats.hits}, Misses: ${cacheStats.misses}, Ratio: ${hitRatio}%`);
}

/**
 * Gets a value from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if not found/expired
 */
function getFromCache(key) {
  const cacheFile = path.join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`);
  
  try {
    if (fs.existsSync(cacheFile)) {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      
      // Check if cache is expired
      if (isAfter(new Date(), new Date(cacheData.expiresAt))) {
        logger.debug(`Cache expired for ${key}`);
        cacheStats.misses++;
        return null;
      }
      
      logger.info(`Using cached data for ${key}`);
      cacheStats.hits++;
      return cacheData.value;
    }
  } catch (error) {
    logger.error(`Error reading cache for ${key}: ${error.message}`);
  }
  
  cacheStats.misses++;
  return null;
}

/**
 * Saves a value to cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 */
function saveToCache(key, value) {
  const cacheFile = path.join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`);
  
  try {
    const cacheData = {
      value,
      createdAt: new Date().toISOString(),
      expiresAt: addDays(new Date(), CACHE_EXPIRY_DAYS).toISOString()
    };
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
    logger.info(`Cached data for ${key}`);
  } catch (error) {
    logger.error(`Error writing cache for ${key}: ${error.message}`);
  }
}

/**
 * To update the journey criteria based on the pre-defined criteria.
 * For all the supported criteria, @see models/MarketingCloud/JourneyBuilder/DecisionSplitCriteria.js
 */
const csvFileName = 'journeyDoc.csv'

async function main() {
  // Log initial memory usage
  console.log("🚀 Starting GenerateJourneyForDoc with cache enabled");
  logMemoryUsage();
  
  // Clean up expired cache files
  cleanupExpiredCache();
  
  let csvKeys = [
    "journeyName",
    "triggerCriteria",
    "repeat",
    "Subject",
    "Case Origin",
    "Campaign",
    "Category",
    "Sub Category",
    "minMinutesToThisActivity",
    "maxMinutesToThisActivity",
    "minDaysToThisActivity",
    "maxDaysToThisActivity",
    "emails",
    "smses",
    "lmses",
    "use369",
    "journeyFlow"
  ]

  // let allJourneys = await mcJourney.getAll()

  let csvRows = []
  let csvWriter = createCsvWriter({
    path: csvFileName,
    header: csvKeys.map(k => { return { id: k, title: k } }),
    append: false
  });

  const markets = ['HK', 'TW', 'KR']
  // const markets = ['KR']

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i]
    let mcbase = new MCBase({ market })
    await mcbase.doAuth()

    let mcJourney = mcbase.factory('Journey')
    let mcJB = mcbase.factory('JourneyBuilder')
    let mcDE = mcbase.factory('DataExtension')
    let mcAutomation = mcbase.factory('Automation')

    logger.info(`Fetching journeys for ${market} `)
    
    // Try to get journeys from cache
    const journeyCacheKey = `all_journeys_${market}`;
    let allJourneys = getFromCache(journeyCacheKey);
    
    if (!allJourneys) {
      logger.info(`Getting journeys for ${market} from API (not in cache or expired)`);
      allJourneys = await mcJourney.getAll();
      // Save to cache
      saveToCache(journeyCacheKey, allJourneys);
    } else {
      logger.info(`Using cached journeys for ${market}`);
    }
    
    let journeyNames = []

    const modifiedDateThreshold = format(subDays(new Date(), 180), "yyyy-MM-dd'T'00:00:00.000");

    for (let i = 0; i < allJourneys.length; i++) {
      if (i % 50 === 0) {
        await mcbase.doAuth() // auth again
      }

      const j = allJourneys[i];

      // console.log('j', j)
      if (j && (/test/i).test(j.name)) {
        logger.debug(`Skip journey ${j.name} due to "test"`)
      } else if (j && j.modifiedDate >= modifiedDateThreshold) { // recently journeys
        if (j.status == 'Published' || (j.status == 'Draft' && j.version > 1)) {
          journeyNames.push(j.name)
          logger.info(`Read journey ${j.name} version:${j.version} status:${j.status}`)
        }
      } else if (j && j.name.indexOf('automd') >= 0) { // automd journeys
        if (j.status == 'Published' || (j.status == 'Draft' && j.version > 1)) {
          journeyNames.push(j.name)
          logger.info(`Read journey ${j.name} version:${j.version} status:${j.status}`)
        }
      } else if ([
        'kr-202109-journey-welcome-new-donor-oneoff', 
        'kr-202109-journey-welcome-new-recurring-donor',
        'kr_2022-new_donor_upgrade',
        'tw-p8_new_subscription-automd-bi-weekly_subscription-20240522'].includes(j.name)) {

      } else if (j) {
        logger.debug(`Skip journey ${j.name} version:${j.version} status:${j.status}`)
      } else {
        logger.debug(`Skip journey ${j.name} since not found`)
      }
    }

    // journeyNames = [
    //   // 'kr-annual_upgrade-adhoc-20231205-honeybee-1click_url_generation',
    //   // 'kr-annual_upgrade-adhoc-20231208-honeybee-1click_url_generation',
    //   // 'kr-annual_upgrade-adhoc-20231211-honeybee-1click_url_generation',
    //   // 'hk-debit_fail-automd-hard_fail',
    //   // 'hk-debit_fail-automd-soft_fail',
    //   // 'hk-debit_fail-automd-weekly_reminder'
    //   'kr-annual_upgrade-adhoc-20231205-honeybee-1click_url_generation',
    //   'kr-middle_donor_upgrade-adhoc-20231205-honeybee-1click_url_generation'
    // ]

    // start to process
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(journeyNames.length, 0);
    
    // Process journeys in smaller batches to avoid memory issues
    let batchSize = 10; // Process 10 journeys at a time
    
    for (let batchStart = 0; batchStart < journeyNames.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, journeyNames.length);
      console.log(`\nProcessing batch ${Math.floor(batchStart/batchSize) + 1}: Journeys ${batchStart + 1}-${batchEnd} of ${journeyNames.length}`);
      
      for (let i = batchStart; i < batchEnd; i++) {
        if (i % 5 === 0) {
          await mcbase.doAuth() // auth again
        }

        progressBar.update(i + 1);

        const jName = journeyNames[i]
        let csvRow = null
        try {
          csvRow = await processJourney({ jName, mcJourney, mcJB, mcDE, mcAutomation })
        } catch (error) {
          logger.error(`Error processing journey ${jName}: ${error.message}`);
          
          if (error.code === 'ENOMEM') {
            logger.error('Memory limit reached. Reducing batch size and continuing...');
            // If memory error occurs, reduce batch size for future batches
            batchSize = Math.max(1, Math.floor(batchSize * 0.5));
            console.error(`\n⚠️ Memory pressure detected - reduced batch size to ${batchSize}`);
          }
          
          // continue with next journey
          continue
        }

        if (csvRow) {
          try {
            // Ensure csvRow has all necessary keys before writing
            const sanitizedRow = {};
            
            // Modify csvRow object to fill in "-" for empty values and show 0 for zero values
            csvKeys.forEach((key) => {
              if (csvRow[key] === undefined || csvRow[key] === null || csvRow[key] === "") {
                sanitizedRow[key] = "-";
              } else if (csvRow[key] === 0) {
                sanitizedRow[key] = 0;
              } else {
                sanitizedRow[key] = csvRow[key];
              }
            });
            
            // Write the sanitized row
            await csvWriter.writeRecords([sanitizedRow]);
            logger.info(`Successfully wrote data for journey: ${jName}`);
          } catch (writeError) {
            logger.error(`Error writing CSV row for ${jName}: ${writeError.message}`);
            // Print the problematic row for debugging
            logger.debug(`Problem row keys: ${Object.keys(csvRow).join(', ')}`);
          }
        }
      }
      
      // Add a small delay between batches to allow garbage collection
      if (batchEnd < journeyNames.length) {
        logger.info('Batch completed. Pausing briefly before next batch...');
        
        // Log memory usage after batch
        console.log(`\n📊 Memory usage after processing batch ${Math.floor(batchStart/batchSize) + 1}:`);
        logMemoryUsage();
        
        // Run garbage collection if available
        if (global.gc) {
          console.log("♻️ Running manual garbage collection...");
          global.gc();
        }
        
        await sleep(1000);
      }
    }
    
    progressBar.stop()
  }


  // download and upload email previews
  // sleep for 1 minutes to wait for all the email received
  logger.info('wait 60 seconds to receiving all the emails')
  await sleep(60 * 1000)
  await downloadUploadEmailPreviews()

  // upload build folder (including journey flows & email previews) to sftp
  try {
    const secretFilePath = path.join(process.env.HOME, '.npm-en-uploader-secret');
    if (fs.existsSync(secretFilePath)) {
      const secretsJson = fs.readFileSync(secretFilePath, 'utf-8');
      const serverConfigs = JSON.parse(secretsJson);

      if (serverConfigs && serverConfigs.ftp_tw) {
        const localPath = path.join(path.basename(__dirname), '../build');
        const remotePath = '/htdocs/app/sfmc/journey-master-doc';
        logger.info(`Syncing to server ${serverConfigs.ftp_tw.host}:${remotePath}`);
        await syncFolder(serverConfigs.ftp_tw, localPath, remotePath);
      } else {
        logger.error('Server config missing ftp_tw configuration');
      }
    } else {
      logger.error(`Secret file not found: ${secretFilePath}`);
    }
  } catch (ftpError) {
    logger.error(`Error uploading to SFTP: ${ftpError.message}`);
  }

  // sync the csv file to google sheet
  try {
    logger.info(`Syncing to Google Sheet`);
    if (fs.existsSync(csvFileName)) {
      await uploadCsvFileToGSheet();
    } else {
      logger.error(`CSV file ${csvFileName} not found for Google Sheet upload`);
    }
  } catch (gsheetError) {
    logger.error(`Error uploading to Google Sheet: ${gsheetError.message}`);
  }
}

async function processJourney(params) {
  let data

  const { mcJourney, mcJB, mcDE, mcAutomation, jName } = params;
  const cacheKey = `journey_${jName}`;
  
  // Try to get from cache first
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    logger.info(`Using cached data for journey ${jName}`);
    return cachedData;
  }
  
  logger.info(`Processing journey ${jName} (not found in cache or expired)`);
  const csvRow = { journeyName: jName };

  // Try to get journey source from cache
  const journeySrcCacheKey = `journey_src_${jName}`;
  let srcJ = getFromCache(journeySrcCacheKey);
  
  if (!srcJ) {
    logger.info(`Loading journey source for ${jName} from API (not in cache or expired)`);
    srcJ = await mcJB.loadSrcJourneyName(jName);
    // Save to cache
    saveToCache(journeySrcCacheKey, srcJ);
  } else {
    logger.info(`Using cached journey source for ${jName}`);
  }
  
  mcJB.generateActivityWaitMap();
  params.srcJ = srcJ
  logger.info(`Read journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)

  data = await processTrigger(params);
  Object.assign(csvRow, data);

  data = await processCases(params);
  Object.assign(csvRow, data);

  data = await processEmail(params)
  Object.assign(csvRow, data);

  data = await processSms(params)
  Object.assign(csvRow, data);
  data = await processLms(params)
  if (csvRow.smses === '-' || csvRow.smses === '') {
    Object.assign(csvRow, data);
  }
  console.log('data.smses 2', data.smses)

  data = await process369Criteria(params);
  Object.assign(csvRow, data);

  data = await processJourneyFlow(params);
  Object.assign(csvRow, data);

  // Save to cache
  saveToCache(cacheKey, csvRow);

  return csvRow;
}

async function processTrigger({ srcJ, jName, mcJB, mcJourney, mcDE, mcAutomation }) {
  let returnObj = {
    triggerCriteria: '-',
    repeat: '-'
  }

  if (mcJB.isSFObjectTriggered()) {
    logger.info(`Journey "${jName}" is triggered by a Salesforce trigger.`);

    let triggers = srcJ.triggers
    let journeyTriggerCriteriaStr =
      `Trigger: ${_.get(triggers, '0.configurationArguments.objectApiName')} ${_.get(triggers, '0.configurationArguments.evaluationCriteriaSummary')}
${_.get(triggers, '0.configurationArguments.primaryObjectFilterSummary')}
${_.get(triggers, '0.configurationArguments.relatedObjectFilterSummary')}
`
    returnObj.triggerCriteria = journeyTriggerCriteriaStr
    returnObj.repeat = "Occurrence-based"
  } else if (mcJB.isAutomationTriggered() || mcJB.isJourneyScheduled()) {
    if (mcJB.isAutomationTriggered()) {
      logger.info(`Journey "${jName}" is triggered by a Automation Trigger.`);
    } else if (mcJB.isJourneyScheduled()) {
      logger.info(`Journey "${jName}" is triggered by a Journey Scheduled Trigger.`);
    }

    // Resolving [${jName}] definitions
    const eventDefCacheKey = `journey_event_def_${jName}`;
    let eventDef = getFromCache(eventDefCacheKey);
    
    if (!eventDef) {
      logger.info(`Getting journey event definitions for ${jName} from API (not in cache or expired)`);
      eventDef = await mcJourney.getJourneyEventDefinitionsByJourneyName(jName);
      saveToCache(eventDefCacheKey, eventDef);
    } else {
      logger.info(`Using cached journey event definitions for ${jName}`);
    }
    
    let deName = _.get(eventDef, 'dataExtensionName', null);

    // resolve the original de
    const deCacheKey = `data_extension_${deName}`;
    let de = getFromCache(deCacheKey);
    
    if (!de) {
      logger.info(`Getting data extension ${deName} from API (not in cache or expired)`);
      de = await mcDE.findDeBy({ field: "Name", value: deName });
      saveToCache(deCacheKey, de);
    } else {
      logger.info(`Using cached data extension info for ${deName}`);
    }
    
    let deId = de.ObjectID;
    let deCustomerKey = de.CustomerKey;
    logger.info(`Target DataExtension is ${deName} (CustomerKey:${deCustomerKey})`);

    // find the query definition which related to this DE
    const queryDefCacheKey = `query_definitions_for_de_${deCustomerKey}`;
    let queryDefinitionsForDE = getFromCache(queryDefCacheKey);
    
    if (!queryDefinitionsForDE) {
      logger.info(`Getting query definitions for DE ${deCustomerKey} from API (not in cache or expired)`);
      queryDefinitionsForDE = await mcAutomation.getQueryDefinitionsForDataExtension(deCustomerKey);
      saveToCache(queryDefCacheKey, queryDefinitionsForDE);
    } else {
      logger.info(`Using cached query definitions for DE ${deCustomerKey}`);
    }

    if (queryDefinitionsForDE.length > 0) {
      let sqls = []
      for (let i = 0; i < queryDefinitionsForDE.length; i++) {
        let thisQryDef = queryDefinitionsForDE[i]
        let sql = thisQryDef.QueryText
        sqls.push(sql.replace(/(?<=SELECT)([\s\S]*?)(?=FROM)/i, ' '))
        logger.info(`QueryDefinition ${thisQryDef.Name} ${thisQryDef.TargetUpdateType} the dataExtension ${deName}`);
      }
      returnObj.triggerCriteria = sqls.join("\n")

      // find the original query definitions
      const automationsCacheKey = `automations_for_query_${queryDefinitionsForDE[0].ObjectID}`;
      let automations = getFromCache(automationsCacheKey);
      
      if (!automations) {
        logger.info(`Getting automations for query ${queryDefinitionsForDE[0].Name} from API (not in cache or expired)`);
        automations = await mcAutomation.findAutomationsByQueryDefObjectIdRest(queryDefinitionsForDE[0].ObjectID);
        saveToCache(automationsCacheKey, automations);
      } else {
        logger.info(`Using cached automations for query ${queryDefinitionsForDE[0].Name}`);
      }
      if (!Array.isArray(automations)) {
        logger.warn(`Cannot find the automation by QueryDefinition ${queryDefinitionsForDE[0].Name} (${queryDefinitionsForDE[0].ObjectID})`)
      } else if (automations.length > 1) {
        logger.warn(`Found more than 1 automation realted to this query definitions`)
        automations.forEach((automation, idx) => {
          logger.warn(`#${idx} Automation: ${automation.name} ${automation.id}`)
        })
      } else if (automations.length < 1) {
        logger.warn(`Cannot find the automation by QueryDefinition ${queryDefinitionsForDE[0].Name} (${queryDefinitionsForDE[0].ObjectID})`)
      } else if (automations.length == 1) { // exactly one automation
        let automation = automations[0]
        let automationScheduleIcalRecur = _.get(automation, 'schedule.icalRecur')
        let automationScheduledTime = _.get(automation, 'schedule.scheduledTime')
        let automationScheduleTimezoneName = _.get(automation, 'schedule.timezoneName')

        // convert to human readable schedule string
        let repeatDisplay = automationScheduleIcalRecur ?
          `${rruleToHumanReadable(automationScheduleIcalRecur)} ${automationScheduledTime.replace(/\d{4}-\d{2}-\d{2}T/, "")} ${automationScheduleTimezoneName}\n(Automation: ${automation.name})`
          :
          `(Automation: ${automation.name})`;

        logger.info(`Repeat: ${repeatDisplay}`);

        returnObj.repeat = repeatDisplay
      } else {
        logger.warn(`Cannot find the automation by QueryDefinition ${queryDefinitionsForDE[0].Name} (${queryDefinitionsForDE[0].ObjectID})`)
      }
    } else {
      logger.warn(`Cannot find the related query denition for de ${deName}`)
    }
  } else {
    // console.log(JSON.stringify(srcJ, null, 2)); // for debug
    logger.error(`Unknow-trigger type for journey ${jName} with type: ${_.get(srcJ, 'triggers.0.type')}`)
  }

  return returnObj
}
async function processCases({ srcJ, mcJB }) {
  const requiredFields = ['Subject', 'Case Origin', 'Campaign', 'Category', 'Sub Category']
  let returnObj = Object.fromEntries(requiredFields.map((field) => [field, '-']));

  let caseActitivies = srcJ.activities.filter(activity =>
    activity.configurationArguments.applicationExtensionKey === "Salesforce_Activity_Case");

  // Extract the required fields from each activity object
  const extractedFields = caseActitivies.map(activity => {
    const fields = _.get(activity, "arguments.objectMap.objects.0.fields");
    const extracted = {};
    if (fields) {
      fields.forEach(field => {
        if (requiredFields.includes(field.FieldLabel)) {
          // Format the field value as "FieldValue(FieldValueLabel)" if FieldValueLabel exists, otherwise just "FieldValue"
          extracted[field.FieldLabel] = field.FieldValueLabel && field.FieldValue !== field.FieldValueLabel
            ? `${field.FieldValueLabel} (${field.FieldValue})`
            : field.FieldValue;
        }
      });
    }

    extracted.minMinutesToThisActivity = mcJB.resolveActivityMinWaitMinutesFromEntry(activity.id)
    extracted.maxMinutesToThisActivity = mcJB.resolveActivityMaxWaitMinutesFromEntry(activity.id)

    extracted.minDaysToThisActivity = Math.floor(extracted.minMinutesToThisActivity / 1440)
    extracted.maxDaysToThisActivity = Math.ceil(extracted.maxMinutesToThisActivity / 1440)

    return extracted;
  });

  // prepare the printed CSV fils
  const concatenatedData = extractedFields.reduce((result, item) => {
    Object.keys(item).forEach(key => {
      const isMin = key.startsWith('min');
      const isMax = key.startsWith('max');
      const value = item[key];

      // The key is checked to see if it starts with "min" or "max". If it does, the corresponding value is compared
      // with the current value and the minimum or maximum value is stored in the result object.
      if (isMin || isMax) {
        if (result[key] === undefined) {
          result[key] = value;
        } else {
          result[key] = isMin ? Math.min(result[key], value) : Math.max(result[key], value);
        }
      } else {
        // If the key does not start with "min" or "max", the corresponding value is concatenated with any existing
        // value in the result object. If there is no existing value, the current value is stored in the result object.
        if (result[key] === undefined) {
          result[key] = value;
        } else if (result[key] !== value) {
          result[key] = `${result[key]}\n${value}`;
        }
      }
    });
    return result;
  }, {});

  Object.assign(returnObj, Object.fromEntries(requiredFields.map(field => [field, null]))) // ensure the field appear
  Object.assign(returnObj, concatenatedData)

  return returnObj
}
async function processEmail({ srcJ, mcJB, mcJourney }) {
  // Check cache for email data
  const emailCacheKey = `email_previews_${srcJ.name}`;
  const cachedEmailData = getFromCache(emailCacheKey);
  
  if (cachedEmailData) {
    logger.info(`Using cached email preview data for ${srcJ.name}`);
    return cachedEmailData;
  }

  // Not in cache, need to send email previews
  try {
    await mcJourney.sendEmailPreviews(
      srcJ.name,
      ['store_this_email@' + process.env.MAILGUN_DOMAIN],
      {
        subjectPrefixFunc: (emailAct) => {
          return `[${srcJ.name}-${emailAct.key}]`
        }
      })  
  } catch (error) {
    console.warn(`Send Email Failed.`)
  }

  let returnObj = { emails: '-' }

  // List Emails
  let emailActivties = []
  srcJ.activities.forEach(act => {
    if (act.type === "EMAILV2") {
      emailActivties.push(act)
    }
  });

  emailActivties.sort((a, b) => { // sort by sending dates
    const aMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(a.id);
    const bMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(b.id);
    return aMinWait - bMinWait;
  });

  emailActivties.forEach((emailAct, idx) => {
    let emailSubject = _.get(emailAct, 'configurationArguments.triggeredSend.emailSubject')
  })

  returnObj.emails = [];

  for (let idx = 0; idx < emailActivties.length; idx++) {
    const emailAct = emailActivties[idx];
    const emailSubject = _.get(emailAct, 'configurationArguments.triggeredSend.emailSubject');
    const exposeFileName = `${srcJ.name}-${emailAct.key}.html`; // should match previous email prefix

    // const emailPreviewLink = `https://change.greenpeace.org.tw/app/sfmc/journey-master-doc/${exposeFileName}`;
    const emailPreviewLink = await shortenUrl(`https://change.greenpeace.org.tw/app/sfmc/journey-master-doc/${exposeFileName}`);
    logger.info(`Email ${idx + 1}: ${emailSubject} (${emailAct.name})\n${emailPreviewLink}`);
    returnObj.emails.push(`#${idx + 1}: ${emailSubject} (${emailAct.name})\n${emailPreviewLink}`);
  }
  returnObj.emails = returnObj.emails.join("\n")
  
  // Save to cache
  saveToCache(`email_previews_${srcJ.name}`, returnObj);
  
  return returnObj
}
async function processSms({ srcJ, mcJB }) {
  // Check cache for SMS data
  const smsCacheKey = `sms_data_${srcJ.name}`;
  const cachedSmsData = getFromCache(smsCacheKey);
  
  if (cachedSmsData) {
    logger.info(`Using cached SMS data for ${srcJ.name}`);
    return cachedSmsData;
  }

  let returnObj = { smses: '-' }

  // List SMSs
  let smsActivities = []
  srcJ.activities.forEach(act => {
    if (act.type === "SMSSYNC") {
      smsActivities.push(act)
    }
  });
  smsActivities.sort((a, b) => {
    const aMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(a.id);
    const bMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(b.id);
    return aMinWait - bMinWait;
  });

  returnObj.smses = smsActivities.map((smsAct, idx) => {
    let smsContent = _.get(smsAct, 'metaData.store.selectedContentBuilderMessage', "")
    smsContent = smsContent.replace(/%%\[[\s\S]*?(?<!\\)\]%%/g, "").trim() // remove any text between %%[...]%%
    logger.info(`SMS ${idx + 1}: ${smsContent} (${smsAct.name})`)
    return `#${idx + 1}: ${smsContent} (${smsAct.name})`
  }).join("\n")
  
  // Save to cache
  saveToCache(smsCacheKey, returnObj);

  return returnObj
}
async function processLms({ srcJ, mcJB }) {
  // Check cache for LMS data
  const lmsCacheKey = `lms_data_${srcJ.name}`;
  const cachedLmsData = getFromCache(lmsCacheKey);
  
  if (cachedLmsData) {
    logger.info(`Using cached LMS data for ${srcJ.name}`);
    return cachedLmsData;
  }
  
  // TODO: Support LMS
  let returnObj = { smses: '-' }

  // List SMSs
  let lmsActivities = []
  srcJ.activities.forEach(act => {
    if (act.type === "REST" && _.get(act, "arguments.execute.inArguments.0.sendtype") == "LMS") {
      lmsActivities.push(act)
    } else if (act.type === "REST" && _.get(act, "arguments.execute.inArguments.0.sendtype") == "SUREMKAKAO") {
      lmsActivities.push(act)
    }
  });
  lmsActivities.sort((a, b) => {
    const aMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(a.id);
    const bMinWait = mcJB.resolveActivityMinWaitMinutesFromEntry(b.id);
    return aMinWait - bMinWait;
  });

  returnObj.smses = lmsActivities.map((aLmsAct, idx) => {
    let lmsName = _.get(aLmsAct, 'name')
    let lmsTitle = _.get(aLmsAct, 'arguments.execute.inArguments.0.title')
    let lmsContent = _.get(aLmsAct, 'arguments.execute.inArguments.0.msg')
    let paramData = _.get(aLmsAct, 'arguments.execute.inArguments.0.paramData')

    lmsContent = lmsContent.replace(/%%\[[\s\S]*?(?<!\\)\]%%/g, "").trim() // remove any text between %%[...]%%
    logger.info(`LMS ${idx + 1}: ${lmsContent} (${lmsName})`)
    return `#${idx + 1}: ${lmsContent} (${lmsName})`
  }).join("\n")
  
  // Save to cache
  saveToCache(lmsCacheKey, returnObj);

  return returnObj
}
async function process369Criteria({ srcJ }) {
  let returnObj = { use369: '-' }

  // List is using 369 rules to exclude call cases
  let found369DecisionSplitOutcomes = []
  srcJ.activities.forEach(act => {
    _.get(act, 'outcomes', []).forEach(outcome => {
      const labelIsStandard369 = _.get(outcome, 'metaData.label') === 'EXCLUDED_BY_369';
      const containsDoNotCallField = _.get(outcome, 'metaData.criteriaDescription', '').includes('Do_Not_Call_Before_This_Date__c');
      const containsLastCalledDate = _.get(outcome, 'metaData.criteriaDescription', '').includes('Last_Call_Date__c');
      const containsTFRCallOutcome = _.get(outcome, 'metaData.criteriaDescription', '').includes('TFR_Call_Outcome__c');
      const containsLastSuccessfulUpgrade = _.get(outcome, 'metaData.criteriaDescription', '').includes('Last_Successful_Upgrade__c');
      const containsLastSuccessfulDowngrade = _.get(outcome, 'metaData.criteriaDescription', '').includes('Last_Successful_Downgrade__c');
      const containsOutboundDirection = _.get(outcome, 'metaData.criteriaDescription', '').includes('Direction__c equal Outbound');

      if (
        labelIsStandard369
        || containsDoNotCallField
        || containsLastCalledDate
        || containsTFRCallOutcome
        || containsLastSuccessfulUpgrade
        || containsLastSuccessfulDowngrade
        || containsOutboundDirection
      ) {
        found369DecisionSplitOutcomes.push(outcome)
      }
    });
  });

  // console.log('found369DecisionSplitOutcomes', found369DecisionSplitOutcomes)
  if (found369DecisionSplitOutcomes.length) {
    returnObj.use369 = found369DecisionSplitOutcomes.map((anOutcome, idx) => {
      logger.info(`RULE ${idx}: ${anOutcome.metaData.label}\n    (${anOutcome.metaData.criteriaDescription})`)
      return `#${idx}: ${anOutcome.metaData.label}\n(${anOutcome.metaData.criteriaDescription})`
    }).join("\n")
  }

  return returnObj
}

function convertToUrlSafeFileName(inputString) {
  const urlSafeFileName = inputString
    .toLowerCase()                       // Convert to lowercase
    .replace(/[^a-z0-9_-]/g, '_')         // Replace non-alphanumeric characters with underscores
    .replace(/_+/g, '_')                 // Replace consecutive underscores with a single underscore
    .replace(/^-|-$/g, '');             // Remove leading and trailing underscores

  return urlSafeFileName;
}

async function processJourneyFlow({ srcJ }) {
  let returnObj = { journeyFlow: '-' }

  let jFlowExport = new JourneyFlowExport(srcJ)
  let html = jFlowExport.exportHTML()

  let buildFolderPath = 'build'
  if (!fs.existsSync(buildFolderPath)) {
    fs.mkdirSync(buildFolderPath);
  }
  let exposeFileName = convertToUrlSafeFileName(jFlowExport._getJourneyName()) + '.html'
  let outputPath = `build/${exposeFileName}`
  fs.writeFileSync(outputPath, html, 'utf8');
  logger.info(`Exported HTML to file ${outputPath}`)

  returnObj.journeyFlow = `https://change.greenpeace.org.tw/app/sfmc/journey-master-doc/${exposeFileName}`

  return returnObj
}

async function downloadUploadEmailPreviews({ } = {}) {
  // the prefix should match the name defined in processEmail
  let mg = new Mailgun({
    domain: process.env.MAILGUN_DOMAIN,
    apiKey: process.env.MAILGUN_APIKEY
  })
  
  // Try to get stored emails from cache
  const emailsCacheKey = `stored_emails_${format(new Date(), 'yyyyMMdd')}`;
  let storedEmails = getFromCache(emailsCacheKey);
  
  if (!storedEmails) {
    logger.info(`Getting stored emails from Mailgun API (not in cache or expired)`);
    try {
      storedEmails = await mg.getStortedEmails({
        limit: 300,
        begin: Math.floor(subDays(new Date(), 1).getTime() / 1000),
        ascending: 'yes'
      });
      // Save to cache
      saveToCache(emailsCacheKey, storedEmails);
    } catch (error) {
      logger.error(`Failed to retrieve stored emails from Mailgun: ${error.message}`);
      
      if (error.code === 'ENOMEM') {
        console.error('\n⚠️ Memory error occurred while fetching emails');
        console.error('  - Using empty email list to continue processing');
      }
      
      // Use empty array to continue processing
      storedEmails = [];
    }
  } else {
    logger.info(`Using cached stored emails`);
  }
  
  let seenEmails = {} // only fetch each email once

  // sort by timestamp desc
  storedEmails.sort((a, b) => b.timestamp - a.timestamp);

  // convert into HTML
  progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(storedEmails.length, 0);
  for (let i = 0; i < storedEmails.length; i++) {
    progressBar.update(i + 1);
    const item = storedEmails[i];
    const thisEmailSubject = item.message.headers.subject

    const formattedDate = format(new Date(Math.ceil(item.timestamp * 1000)), 'yyyy/MM/dd HH:mm:ss');

    logger.debug(`Building ${formattedDate} id:${item.message.headers.subject}`)

    // resolve the email key
    const regex = /\[([^\]]+)\]/;
    const matches = thisEmailSubject.match(regex);

    let firstTokenInsideBrackets;
    if (matches && matches.length > 1) {
      firstTokenInsideBrackets = matches[1];
    }

    //
    if (!firstTokenInsideBrackets) {
      logger.debug(`Skip ${thisEmailSubject} since cannot find the [key] of the email`)
      continue
    }

    if (seenEmails[firstTokenInsideBrackets]) {
      logger.debug(`Skip ${thisEmailSubject} since has seen before`)
      continue
    }

    try {
      // Check cache for this email content
      const emailDetailCacheKey = `email_detail_${item.storage.key}`;
      let storedEmailDetail = getFromCache(emailDetailCacheKey);
      
      if (!storedEmailDetail) {
        logger.info(`Getting email content for ${thisEmailSubject} from Mailgun API`);
        try {
          // fetch and store the email content
          storedEmailDetail = await mg.getStoredEmail(item.storage.key);
          // Save to cache
          saveToCache(emailDetailCacheKey, storedEmailDetail);
        } catch (error) {
          logger.error(`Failed to retrieve email content for ${thisEmailSubject}: ${error.message}`);
          
          if (error.code === 'ENOMEM') {
            logger.error('Memory limit reached. Skipping this email and continuing with others.');
            seenEmails[firstTokenInsideBrackets] = true;
            continue; // Skip this email and continue with others
          }
          
          // Create a placeholder email content if API call fails
          storedEmailDetail = {
            'body-html': `<html><body><h1>Email content could not be retrieved</h1><p>Error: ${error.message}</p></body></html>`
          };
        }
      } else {
        logger.info(`Using cached email content for ${thisEmailSubject}`);
      }

      // Ensure body-html exists to prevent errors when accessing it
      if (!storedEmailDetail['body-html']) {
        logger.warn(`No body-html found for ${thisEmailSubject}, using placeholder content`);
        storedEmailDetail['body-html'] = `<html><body><h1>Email content not available</h1></body></html>`;
      }

      let outputPath = `build/${firstTokenInsideBrackets}.html`;
      fs.writeFileSync(outputPath, storedEmailDetail['body-html'], 'utf8');
      logger.info(`Exported ${thisEmailSubject} to file ${outputPath}`);
    } catch (emailProcessError) {
      logger.error(`Error processing email ${thisEmailSubject}: ${emailProcessError.message}`);
      // Skip this email and continue
      seenEmails[firstTokenInsideBrackets] = true;
    }

    seenEmails[firstTokenInsideBrackets] = true
  }
  progressBar.stop()
}

async function uploadCsvFileToGSheet() {
  try {
    const auth = await getGoogleAuthorize();
    const sheets = google.sheets({ version: 'v4', auth });

    // Replace with your Google Sheet ID and tab name
    const spreadsheetId = process.env.JOURNEY_MASTER_DOC_GSHEET_ID;
    const tabName = process.env.JOURNEY_MASTER_DOC_RAW_DATA_TAB_NAME; // Change to your tab name

    if (!spreadsheetId || !tabName) {
      logger.error('Missing required environment variables: JOURNEY_MASTER_DOC_GSHEET_ID or JOURNEY_MASTER_DOC_RAW_DATA_TAB_NAME');
      return;
    }

    // Read the local CSV file
    const csvFilePath = csvFileName;
    
    // Convert the stream-based code to a Promise to properly handle errors
    return new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(csvFilePath)
        .on('error', (err) => {
          logger.error(`Error reading CSV file: ${err.message}`);
          reject(err);
        })
        .pipe(csv({
          headers: false // Include the header row
        }))
        .on('data', (row) => {
          rows.push(Object.values(row)); // Convert the row object to an array
        })
        .on('error', (err) => {
          logger.error(`Error parsing CSV data: ${err.message}`);
          reject(err);
        })
        .on('end', async () => {
          try {
            // Clear the existing data in the tab
            logger.debug("Cleaning GoogleSheet Content");
            await sheets.spreadsheets.values.clear({
              spreadsheetId,
              range: tabName,
            });

            // Process rows to handle cells that are too large (>50000 characters)
            const MAX_CELL_LENGTH = 50000;
            const processedRows = rows.map(row => {
              return row.map(cell => {
                if (typeof cell === 'string' && cell.length > MAX_CELL_LENGTH) {
                  logger.warn(`Truncating cell content from ${cell.length} to ${MAX_CELL_LENGTH} characters`);
                  return cell.substring(0, MAX_CELL_LENGTH - 3) + '...';
                }
                return cell;
              });
            });

            // Write the new data to the tab
            logger.debug("Writing to Content GoogleSheet Content");
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: tabName,
              valueInputOption: 'RAW',
              resource: { values: processedRows },
            });

            logger.info(`CSV data uploaded to ${tabName} successfully.`);
            resolve();
          } catch (error) {
            logger.error(`Error during Google Sheets operations: ${error.message}`);
            reject(error);
          }
        });
    });
  } catch (error) {
    logger.error(`Error in uploadCsvFileToGSheet: ${error.message}`);
    throw error; // Rethrow to be caught by the main try/catch
  }
}

(async () => {
  var text = await main();
  
  // Log final memory usage
  console.log("\n📊 Final memory usage:");
  logMemoryUsage();
  
  // Log cache statistics at the end
  logCacheStats();
})().catch(e => {
  logger.error(e.stack || e.message);

  if (e.isAxiosError) {
    console.error('Axios Error:', e.code || 'unknown error');

    // Safely check if response and data exist
    if (e.response && e.response.data) {
      logger.error(JSON.stringify(e.response.data, null, 2));
    } else {
      logger.error(`Request failed: ${e.message}`);
      
      // For memory errors, provide a helpful message
      if (e.code === 'ENOMEM') {
        console.error('\n⚠️ Memory error occurred. You may want to:');
        console.error('  - Increase available memory');
        console.error('  - Process fewer markets at a time');
        console.error('  - Use smaller date ranges');
      }
    }
  }
  
  // Log memory usage at time of error
  console.log("\n📊 Memory usage at time of error:");
  try {
    logMemoryUsage();
  } catch (memError) {
    logger.error('Failed to log memory usage:', memError.message);
  }
  
  // Log cache statistics even if there's an error
  try {
    logCacheStats();
  } catch (statsError) {
    logger.error('Failed to log cache statistics:', statsError.message);
  }
});
