/**
 * This class creates an interface for validating, storing, and retrieving xAPI statements
 *
 * For more information, see:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md
 */
import filter from 'lodash/filter';
import find from 'lodash/find';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import isMatch from 'lodash/isMatch';
import isNumber from 'lodash/isNumber';
import overSome from 'lodash/overSome';
import BaseShim from '../baseShim';
import { XAPIVerbMap } from './xAPIVocabulary';
import { OBJECT_TYPES } from './xAPIConstants';

const logging = console; //eslint-disable-line no-console

function actorsEqual(actor1, actor2) {
  if (actor1.mbox && actor2.mbox) {
    return actor1.mbox === actor2.mbox;
  }
  if (actor1.mbox_sha1sum && actor2.mbox_sha1sum) {
    return actor1.mbox_sha1sum === actor2.mbox_sha1sum;
  }
  if (actor1.openid && actor2.openid) {
    return actor2.openid === actor2.openid;
  }
  if (actor1.account && actor2.account) {
    return actor1.homePage === actor2.homePage && actor1.name && actor2.name;
  }
  return false;
}

const STATE = 'state';

const ACTIVITY_PROFILE = 'activityProfile';

const AGENT_PROFILE = 'agentProfile';

const STATEMENT = 'statement';
export default class xAPI extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
    this.userData = {};
    this.nameSpace = 'xAPI';
    this.__setData = this.__setData.bind(this);
    this.__setUserData = this.__setUserData.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
    this.on(this.events.USERDATAUPDATE, this.__setUserData);
  }

  __setData(data = {}) {
    this.data = data;
  }

  __setUserData(userData = {}) {
    this.userData = userData;
  }

  /*
   * Applies heuristics based on the CMI5 vocabulary:
   * https://github.com/AICC/CMI-5_Spec_Current/blob/quartz/cmi5_spec.md#xapi_data_model
   * and the verbs that are defined for use in H5P, in order to calculate progress
   * @return {Number|null} returns a value between 0 or 1 or null if no progress could
   * be calculated.
   */
  __calculateProgress() {
    const successStatement = find(
      this.data[STATEMENT],
      s =>
        !s.error &&
        (s.verb.id === XAPIVerbMap.mastered ||
          s.verb.id === XAPIVerbMap.passed ||
          s.verb.id === XAPIVerbMap.completed),
    );
    if (successStatement) {
      return 1;
    }
    // If there has been any interaction return some progress, otherwise null.
    return Object.keys(this.data[STATEMENT] || {}).length ? 0.01 : null;
  }

  createAgent() {
    return {
      mbox: `mailto:${this.userData.userId}@kolibri.to`,
    };
  }

  iframeInitialize(contentWindow) {
    this.__setXAPIInterface();
    Object.defineProperty(contentWindow, this.nameSpace, {
      value: this.xAPIInterface,
      configurable: true,
    });
  }

  getStatement(statementId) {
    return (this.data[STATEMENT] || []).find(s => s.id === statementId);
  }

  getStatements({
    statementId,
    voidedStatementId,
    agent,
    verb,
    activity,
    registration,
    related_activities,
    related_agents,
    since,
    until,
    limit,
    ascending,
  }) {
    const orFns = [];
    let statements = this.data[STATEMENT] || [];
    if (agent) {
      if (!related_agents) {
        if (!actorsEqual(agent, this.createAgent())) {
          // Searching by an agent that is not our agent, so just return nothing
          statements = [];
        }
      } else {
        orFns.push(
          s => actorsEqual(s.object, agent),
          s =>
            s.object.objectType === OBJECT_TYPES.SUBSTATEMENT && actorsEqual(s.object.actor, agent),
          s => s.context && s.context.instructor && actorsEqual(s.context.instructor, agent),
          s => s.context && s.context.team && actorsEqual(s.context.team, agent),
          s => s.authority && s.authority && actorsEqual(s.authority, agent),
        );
      }
    }
    if (statementId && voidedStatementId) {
      return null;
    } else if (statementId) {
      return statements.find(s => s.id === statementId);
    } else if (voidedStatementId) {
      return statements.find(s => s.id === voidedStatementId);
    }
    const match = {};
    if (verb) {
      match.verb = { id: verb };
    }
    if (activity) {
      const activityMatch = {
        object: { id: activity, objectType: OBJECT_TYPES.ACTIVITY },
      };
      if (!related_activities) {
        Object.assign(match, activityMatch);
      } else {
        orFns.push(
          s => isMatch(s, activityMatch),
          s => s.object.objectType === OBJECT_TYPES.SUBSTATEMENT && isMatch(activityMatch),
          s =>
            s.context &&
            Object.values(s.context.contextActivities || {}).some(a =>
              a.some(act => act.id === activity),
            ),
        );
      }
    }
    if (registration) {
      match.context = { registration: registration };
    }
    statements = filter(statements, match);
    const orFilter = overSome(orFns);
    statements = statements.filter(statements, orFilter);
    if (since) {
      statements = statements.filter(s => s.stored > since);
    }
    if (until) {
      statements = statements.filter(s => s.stored <= until);
    }
    if (ascending) {
      // Because we used filter above, this should be a new array
      // not directly from the data 'statements' property, so reversing in place is safe
      statements.reverse();
    }
    // Only return statements that we have not flagged as errored.
    statements = statements.filter(s => !s.error);
    if (limit && isNumber(limit)) {
      statements = statements.slice(0, limit);
    }
    return statements;
  }

  storeStatements(...statements) {
    // Note that this stores statements with the most recent first
    // to allow for the default get behaviour.
    for (let i = 0; i < statements.length; i++) {
      statements[i].stored = this.__now().toISOString();
      if (!statements[i].timestamp) {
        statements[i].timestamp = this.__now().toISOString();
      }
      // We do not currently support attachments, so remove them before
      // saving.
      delete statements[i].attachments;
    }
    this.data[STATEMENT] = this.data[STATEMENT] || [];
    this.data[STATEMENT].unshift(...statements.reverse());
    this.stateUpdated();
    return statements.reverse();
  }

  getValue(nameSpace, id) {
    if (id) {
      return get(this.data, [nameSpace, id, 'value']);
    }
    return get(this.data, nameSpace, {});
  }

  getIds(nameSpace, since = '') {
    return Object.keys(this.data[nameSpace] || {}).filter(
      id => this.data[nameSpace][id].stored > since,
    );
  }

  setValue(nameSpace, id, stateObject) {
    set(this.data, [nameSpace, id], {
      stored: this.__now().toISOString(),
      value: stateObject,
    });
    this.stateUpdated();
  }

  sendValue(nameSpace, id, value) {
    return new Promise((resolve, reject) => {
      try {
        JSON.stringify(value);
      } catch (e) {
        reject('Can only store JSON serializable values');
      }
      if (!id) {
        reject('Must specify an id');
      }
      this.setValue(nameSpace, id, value);
      resolve();
    });
  }

  deleteValue(nameSpace, id) {
    if (id) {
      unset(this.data, [nameSpace, id]);
    } else {
      unset(this.data, nameSpace);
    }
    this.stateUpdated();
  }

  /*
   * A simple interface for interacting with xAPI
   * Can be used by Kolibri aware HTML5 apps to
   * directly manage xAPI data.
   */
  __setXAPIInterface() {
    const self = this;

    class Shim {
      /*
       * Modify an xAPI statement in place to add non-learning activity specific properties.
       * @param {Object} statement - an object representing an xAPI statement's JSON
       */
      prepareStatement(statement) {
        if (!statement.actor) {
          statement.actor = self.createAgent();
        }
        if (!statement.timestamp) {
          statement.timestamp = self.__now().toISOString();
        }
      }
      /*
       * Store a statement.
       * @param {Object} statement - an object representing an xAPI statement's JSON
       * @param {Boolean} [compress=false] - whether we should discard some data before storage
       * @return {Promise} a Promise that resolves when the statement has been successfully stored
       */
      sendStatement(statement, compress = false) {
        return new Promise(resolve => {
          return import(
            /* webpackChunkName: "xAPISchema", webpackPrefetch: true */ './xAPISchema'
          ).then(({ Statement }) => {
            this.prepareStatement(statement);
            try {
              statement = Statement.clean(statement);
            } catch (e) {
              logging.debug('Statement: ', statement, 'gave the following error: ', e);
              statement.error = e.message;
            }
            if (compress) {
              // If we are compressing, then remove things that we
              // can probably reconstruct
              delete statement.actor;
              delete statement.authority;
              if (
                !statement.object.objectType ||
                statement.object.objectType === OBJECT_TYPES.ACTIVITY
              ) {
                delete statement.object;
              }
            }
            self.storeStatements(statement);
            self.stateUpdated();
            resolve();
          });
        });
      }
      /*
       * Get statements that have previously been recorded
       * Based on LRS behaviour defined here:
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#213-get-statements
       * @param {Object} params - an object with search params for statements
       * @param {string} [params.statementId] - Id of Statement
       * @param {string} [params.voidedStatementId] - Id of voided Statement
       * @param {Object} [params.agent] - Agent object that is the agent of the statement
       * @param {string} [params.verb] - Verb IRI
       * @param {string} [params.activity] - Activity IRI that matches Object of statement
       * @param {string} [params.registration] - Registration UUID
       * @param {Boolean} [params.related_activities=false] - Check activity IRI against any
       * activity in the statement
       * @param {Boolean} [params.related_agents=false] - Check agent object against any
       * agent in the statement
       * @param {string} [params.since] - Time to check statements since
       * @param {string} [params.until] - Time to check statements until
       * @param {Number} [params.limit] - Maximum number of statements to return
       * @param {Boolean} [params.ascending=false] - Whether to return statements in ascending order
       * @return {Promise} Promise that will resolve with the statements
       */
      getStatements(params) {
        return Promise.resolve(self.getStatements(params));
      }
      /*
       * Gets an Activity object if stored.
       * @param {string} id   the id of the Activity to get
       * @return {Promise} Promise that will resolve to the activity
       */
      getActivities(id) {
        return Promise.resolve({ id });
      }
      /*
       * Store state
       * @param {string} stateId - key for the state to store
       * @param {string} stateValue - the value for the state to store
       * @return {Promise} Promise that will resolve when the state is stored
       */
      sendState(stateId, stateValue) {
        return self.sendValue(STATE, stateId, stateValue);
      }
      /*
       * Retrieve state
       * @param {string} stateId - key for the state
       * @return {Promise} Promise that will resolve with the value or null
       */
      getState(stateId) {
        return Promise.resolve(self.getValue(STATE, stateId) || null);
      }
      /*
       * Retrieve multiple pieces of state, stored since a certain time
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#multiple-document-get
       * @param {string} since - timestamp to retrieve state stored since
       * @return {Promise} Promise that will resolve with the matching state ids
       */
      getStateIds(since) {
        return Promise.resolve(self.getIds(STATE, since));
      }
      /*
       * Delete state
       * @param {string} stateId - key for the state
       * @return {Promise} Promise that will resolve when deleted
       */
      deleteState(stateId) {
        self.deleteValue(STATE, stateId);
        return Promise.resolve();
      }
      /*
       * Store activity profile id and value
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#single-document-put--post--get--delete-1
       * @param {string} id - key for the activity profile to store
       * @param {string} value - the value for the activity profile to store
       * @return {Promise} Promise that will resolve when the activity profile is stored
       */
      sendActivityProfile(id, value) {
        return self.sendValue(ACTIVITY_PROFILE, id, value);
      }
      /*
       * Get activity profile by id
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#single-document-put--post--get--delete-1
       * @param {string} id - key for the activity profile to store
       * @return {Promise} Promise that will resolve with the activity profile or null
       */
      getActivityProfile(id) {
        return Promise.resolve(self.getValue(ACTIVITY_PROFILE, id) || null);
      }
      /*
       * Retrieve multiple activity profile ids, stored since a certain time
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#multiple-document-get-2
       * @param {string} since - timestamp to retrieve activity profiles stored since
       * @return {Promise} Promise that will resolve with the matching activity profile ids
       */
      getActivityProfileIds(since) {
        return Promise.resolve(self.getIds(ACTIVITY_PROFILE, since));
      }
      /*
       * Delete activity profile
       * @param {string} id - key for the activity profile
       * @return {Promise} Promise that will resolve when deleted
       */
      deleteActivityProfile(id) {
        self.deleteValue(ACTIVITY_PROFILE, id);
        return Promise.resolve();
      }
      /*
       * Return the agent to use in statements
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#combined-information-get
       * return {Promise} Promise that resolves to the agent
       */
      getAgent() {
        return Promise.resolve(self.createAgent());
      }
      /*
       * Store agent profile id and value
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#single-agent-or-profile-document-put--post--get--delete
       * @param {string} id - key for the agent profile to store
       * @param {string} value - the value for the agent profile to store
       * @return {Promise} Promise that will resolve when the agent profile is stored
       */
      sendAgentProfile(id, value) {
        return self.sendValue(AGENT_PROFILE, id, value);
      }
      /*
       * Get agent profile by id
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#single-agent-or-profile-document-put--post--get--delete
       * @param {string} id - key for the agent profile to store
       * @return {Promise} Promise that will resolve with the agent profile or null
       */
      getAgentProfile(id) {
        return Promise.resolve(self.getValue(AGENT_PROFILE, id) || null);
      }
      /*
       * Retrieve multiple agent profile ids, stored since a certain time
       * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#multiple-document-get-1
       * @param {string} since - timestamp to retrieve agent profiles stored since
       * @return {Promise} Promise that will resolve with the matching agent profile ids
       */
      getAgentProfileIds(since) {
        return Promise.resolve(self.getIds(AGENT_PROFILE, since));
      }
      /*
       * Delete agent profile
       * @param {string} id - key for the agent profile
       * @return {Promise} Promise that will resolve when deleted
       */
      deleteAgentProfile(id) {
        self.deleteValue(AGENT_PROFILE, id);
        return Promise.resolve();
      }
    }
    this.xAPIInterface = new Shim();

    return this.xAPIInterface;
  }
}
