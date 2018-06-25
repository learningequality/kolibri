/**
* This class allows for JavaScript apps to record tracking and
* assessment data. It also can provide limited local reporting of data,
* but more advanced analysis and assessment takes place by submitting the 
* data to a REST API for further processing.
*/
 class Watcher {
    /**
    * Creates a Watcher tracking instance. Creates a localStorage root object
    * with the specified appId. All localStorage keys will be prefixed by this
    * ID to prevent conflicts with other local Knowitol instances.
    *
    * @param {string} appId - A unique ID for the app, in org.orgname.productname format.
    */
    constructor(appId) {

    }

    /**
    * Starts a tracking session for the specified user. The userid can be in
    * whatever format desired by the app, but it must be unique for each user
    * to avoid data conflicts. If you are performing remote sync, it must
    * be unique in the remote API database as well. If the user is not in the
    * local database, they will be added.
    * 
    * @param {string} userid a user id that is unique for tracking purposes.
    */
    startTrackingSession(userid) {

    }

    /**
    * Ends the current tracking session. Any attempt to record data after this
    * point will fail until startTrackingSession is called again.
    *
    * @return {object} A JSON data structure with statisics about the session, including time spent, activites performed, and other info.
    */
    endTrackingSession() {

    }

    /**
    * Gets the list of all users who have tracking and assessment data in the system.
    *
    * @return {array} Array of users registered in the system.
    */
    getUsers() {

    }

    /**
    * Called when an activity, which is effectively any discrete state in the app besides
    * an assessment, is started. If another activity is active, it calls activityFinished
    * on it before starting the new one.
    *
    * @param name - {string} Name of activity, should be unique and will not be displayed. 
    */
    activityStarted(name) {

    }

    /**
    * Called when the current activity has been paused, due to events such
    * as screensaver activation or a pause button / menu being selected.
    * Stops time tracking.
    */
    activityPaused() {

    }

    /**
    * Called when the current activity has been resumed. Resumes time tracking.
    */
    activityResumed() {

    }

    /**
    * Notifies the library that the current activity was finished.
    */
    activityFinished() {

    }

    /**
    * Returns all actions performed by the specified user for the named activity.
    *
    * @param {string} name - Activity name. If omitted, defaults to the current activity.
    * @param {string} userid - ID of user to retrieve data for. If omitted, defaults to current user.
    * @return {object} A JSON dict with activity summary info, and an "actions" key containing a list of actions.
    */
    getActivityDataForUser(name, userid) {
    
    }

    /**
    * Returns all assessments performed by the specified user for the named assessment.
    *
    * @param {string} name - Name of asssessment to retrieve data for.
    * @param {string} userid - ID of user to retrieve data for. If omitted, defaults to current user.
    * @return {object} A JSON dict with activity summary info, and an "actions" key containing a list of actions.
    */
    getAssessmentDataForUser(name, userid) {
    
    }

    /**
    * Returns all assessments completed or in progress for the specified user.
    * 
    * @param {string} assessmentid - ID of assessment to retrieve data on.
    * @param {string} userid - ID of user to retrieve data for. If omitted, defaults to current user.
    * @return {object} A JSON data object containing a summary of overall progress, and all assessment data in an "assessments" key.
    */
    getAllAssessments(userid) {
    
    }

    /**
    * This method is used to record any action or interaction within the app
    * that may be useful for tracking.
    *
    * @param {string} action - The action that was performed (e.g. content_viewed, object_clicked)
    * @param {string} object - The target of the action (e.g. an id of an object, such as a content node or item in game)
    * @param {object} data - (Optional) A dictionary containing a key/value structure of relevant params
    * @param {date} timestamp - (Optional) If specified, the time the action occurred. Defaults to current time
    */
    actionPerformed(action, object, data, timestamp) {

    }

    /**
    * Indicates an assessment has started, and returns a unique ID for the assessment.
    * Assessments may be taken multiple times. It is up to the calling application to lock
    * an assessment after completion if this functionality is not desired.
    *
    * @param {string} name - The name of the assessment.
    * @return {string} A unique ID for this assessment, to be used when calling assessment methods.
    */
    assessmentStarted(name) {
        
    }

    /**
    * Records an assessment response, along with some relevant data about the context.
    *
    * @param {string} itemid - ID refering to the specific assessment item being answered.
    * @param {string} answerid - ID of the answer selected by the user.
    * @param {number} correct - A value from 0 to 1 indicating the correctness of the answer.
    * @param {object} hints_used - A list of hints that were used while answering.
    * @param {object} extra_data - (Optional) A key/value dictionary of data related to the answer.
    * @param {date} timestamp - (Optional) The time when the answer was given. Defaults to the time this method is called.
    * @param {date} startTime - (Optional) The time when the item was presented. Used to determine time taken to answer. Defaults to the time this method is called.
    */
    assessmentResponse(answerid, correct, hints_used, extra_data, timestamp, startTime) {

    }

    /**
    * Pauses the current assessment. Stops time tracking.
    */
    assessmentPaused() {

    }

    /**
    * Resumes the current assessment. Resumes time tracking.
    */
    assessmentResumed() {

    }

    /**
    * Indicates that an assessment has been finished.
    */
    assessmentFinished() {

    }

    /**
    * Indicates that the user has been awarded an achievement.
    *
    * @param {string} achivementid - Achievement ID unique to the calling application.
    */
    achievementAwarded(achievementid) {

    }

    /**
    * Get a list of achievements that have been awarded to the user.
    *
    * @param {string} userid - ID of the user. If omitted, defaults to current user.
    * @return {array} List of achievements the user has earned.
    */
    getAchievementsForUser(userid) {

    }
 }

