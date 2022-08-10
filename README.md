
# gpea-marketingcloud-toolkit

  
  

# Handy Tools

  

## To Update Journey Decision Split Criteria

By using this script, you can replace the journey decision split criteria with the pre-defineded criteria. 

Steps:
1. Name the decision split path name with the pre-defined path names. 
2. Assign ANY criteria for that path. The script will replace this criteria later. (Our goal is just to save this journey.)
3. Open the script. `cli/UpdateJourneyDecisionSplits.js`, edit following lines

```
const srcJourneyName = "tw-special_appeal-adhoc-20220802-general_rg_donors"
const destJourneyName = "up-test-journey"
const market = "TW"
```
4. Run this script `node cli/UpdateJourneyDecisionSplits.js`
5. This script copy the `srcJourney`, replace all the matched criteria, and write it back to the `destJourney`.
6. Please review the `destJourney`. If everything is OK, you can assign the same journey for both `srcJourney` and `destJourney` which means edit in-place. 

#### pre-defined criterias:

* CALL_OPT_OUT
* PHONE_IS_VALID
* PHONE_NOT_VALID

* EMAIL_OPT_OUT
* EMAIL_IS_VALID
* EMAIL_NOT_VALID

* DONATED_BEFORE
* DONATED_RECENTLY
* DONATED_RG_RECENTLY
* DONATED_SG_RECENTLY
* UPGRADED_RECENTLY

* EXCLUDED_BY_369
* IN_OTHER_JOURNEY
* STILL_HAVE_OPENED_CASE
* INTERESTS_DEFINED

* PREF_ENG
* TOO_YOUNG


## To send journey email previews

This script will send all the email previews of a journey to the given inbox. It's quite usefull if we need to provide email previews for colleagues. 

### What this script do
1. Fetch the journey activities, find our all the email and SMS activities.
2. Fetch the data extension of the journey, randomly pick a contact.
3. For each email, render the email with that contact and send to the given inbox.
4. For each SMS, render the SMS with the contact and display the SMS content in the terminal. 

### How to run the script

1. Open the file `cli/SendJourneyEmailPreviews.js` , edit following lines
```
let targetJourneyName = 'hk-lead_conversion-automd-plastic-dpt-policy'
let emailPrefix = ``
let recipients = ['uchen@greenpeace.org']
let market = "hk"
```
2. Run the script `node cli/SendJourneyEmailPreviews.js`

### What if I need to use a specific data extension?

Replace this line
```
let deName = _.get(eventDef, 'dataExtensionName', null)
```
with
```
let deName = 'YOUR_TARGET_DATAEXTENSION_NAME'
```
