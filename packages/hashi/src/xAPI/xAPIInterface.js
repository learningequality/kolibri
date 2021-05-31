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

  __calculateProgress() {
    if (
      find(
        this.data[STATEMENT],
        s =>
          s.verb.id === XAPIVerbMap.mastered ||
          s.verb.id === XAPIVerbMap.passed ||
          s.verb.id === XAPIVerbMap.completed ||
          (s.result && s.result.success)
      )
    ) {
      return 1;
    }
    const scoreStatement = find(
      this.data[STATEMENT],
      s =>
        s.result &&
        s.result.score &&
        (s.result.score.scaled || (s.result.score.min && s.result.score.max && s.result.score.raw))
    );
    if (scoreStatement) {
      if (scoreStatement.result.score.scaled) {
        return scoreStatement.result.score.scaled;
      }
      return (
        (scoreStatement.result.score.raw - scoreStatement.result.score.min) /
        (scoreStatement.result.score.max - scoreStatement.result.score.min)
      );
    }
    return null;
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
          s => s.authority && s.authority && actorsEqual(s.authority, agent)
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
              a.some(act => act.id === activity)
            )
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
      id => this.data[nameSpace][id].stored > since
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
      prepareStatement(statement) {
        if (!statement.actor) {
          statement.actor = self.createAgent();
        }
        if (!statement.timestamp) {
          statement.timestamp = self.__now().toISOString();
        }
      }
      sendStatement(statement, compress = false) {
        return new Promise((resolve, reject) => {
          return import(
            /* webpackChunkName: "xAPISchema", webpackPrefetch: true */ './xAPISchema'
          ).then(({ Statement }) => {
            this.prepareStatement(statement);
            try {
              statement = Statement.clean(statement);
            } catch (e) {
              reject(e);
              return;
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
      getStatements(params) {
        return Promise.resolve(self.getStatements(params));
      }
      getActivities(id) {
        return Promise.resolve({ id });
      }
      sendState(stateId, stateValue) {
        return self.sendValue(STATE, stateId, stateValue);
      }
      getState(stateId) {
        return Promise.resolve(self.getValue(STATE, stateId) || null);
      }
      getStateIds(since) {
        return Promise.resolve(self.getIds(STATE, since));
      }
      deleteState(stateId) {
        self.deleteValue(STATE, stateId);
        return Promise.resolve();
      }
      sendActivityProfile(id, value) {
        return self.sendValue(ACTIVITY_PROFILE, id, value);
      }
      getActivityProfile(id) {
        return Promise.resolve(self.getValue(ACTIVITY_PROFILE, id) || null);
      }
      getActivityProfileIds(since) {
        return Promise.resolve(self.getIds(ACTIVITY_PROFILE, since));
      }
      deleteActivityProfile(id) {
        self.deleteValue(ACTIVITY_PROFILE, id);
        return Promise.resolve();
      }
      getAgent() {
        return Promise.resolve(self.createAgent());
      }
      sendAgentProfile(id, value) {
        return self.sendValue(AGENT_PROFILE, id, value);
      }
      getAgentProfile(id) {
        return Promise.resolve(self.getValue(AGENT_PROFILE, id) || null);
      }
      getAgentProfileIds(since) {
        return Promise.resolve(self.getIds(AGENT_PROFILE, since));
      }
      deleteAgentProfile(id) {
        self.deleteValue(AGENT_PROFILE, id);
        return Promise.resolve();
      }
    }
    this.xAPIInterface = new Shim();

    return this.xAPIInterface;
  }
}
