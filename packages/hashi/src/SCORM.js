/**
 * This class offers an API-compatible replacement window.API for SCORM modules
 * to be used when apps are run in sandbox mode.
 *
 * For more information, see:
 * https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/
 */
import BaseShim from './baseShim';

const logger = console; //eslint-disable-line no-console

const TRUE = 'true';

const NO_ERROR = 0;

// Keys for which '_child' property is defined
// For simplicity, we just list the entire path here
// and the desired return value.
const childKeys = {
  'cmi.core._children':
    'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time',
  'cmi.core.score._children': 'raw,min,max',
  'cmi.objectives._children': 'id,score,status',
  'cmi.student_data._children': '',
  'cmi.student_preference._children': 'language',
  'cmi.interactions._children':
    'id,objectives,time,type,correct_responses,weighting,student_response,result,latency',
};

// Keys for which '_count' property is defined
const countKeys = {
  correct_responses: 'correct_responses',
  interactions: 'interactions',
  objectives: 'objectives',
};

// Values which we will just return an empty value from
const emptyKeys = {
  'cmi.comments_from_lms': 'cmi.comments_from_lms',
  'cmi.launch_data': 'cmi.launch_data',
};

// Vendored and modified from
// https://github.com/dfahlander/Dexie.js/blob/2337c0fcb093219c07723f81363b806d203f5c8b/src/functions/utils.ts#L118

export function getByKeyPath(obj, keyPath) {
  // http://www.w3.org/TR/IndexedDB/#steps-for-extracting-a-key-from-a-value-using-a-key-path
  if (obj.hasOwnProperty(keyPath)) {
    return obj[keyPath]; // This line is moved from last to first for optimization purpose.
  }
  if (!keyPath) {
    return obj;
  }
  if (typeof keyPath !== 'string') {
    const rv = [];
    for (let i = 0, l = keyPath.length; i < l; ++i) {
      rv.push(getByKeyPath(obj, keyPath[i]));
    }
    return rv;
  }
  const period = keyPath.indexOf('.');
  if (period !== -1) {
    const leadingKeyPath = keyPath.substr(0, period);
    const innerObj = obj[leadingKeyPath];
    const innerKeyPath = keyPath.substr(period + 1);
    if (innerKeyPath === '_count' && countKeys[leadingKeyPath] && Array.isArray(obj)) {
      return obj.length;
    }
    return innerObj === undefined ? undefined : getByKeyPath(innerObj, innerKeyPath);
  }
  return undefined;
}

export function setByKeyPath(obj, keyPath, value) {
  if (!obj || keyPath === undefined) {
    return;
  }
  if ('isFrozen' in Object && Object.isFrozen(obj)) {
    return;
  }
  if (typeof keyPath !== 'string' && 'length' in keyPath) {
    for (let i = 0, l = keyPath.length; i < l; ++i) {
      setByKeyPath(obj, keyPath[i], value[i]);
    }
  } else {
    const period = keyPath.indexOf('.');
    if (period !== -1) {
      const currentKeyPath = keyPath.substr(0, period);
      const remainingKeyPath = keyPath.substr(period + 1);
      if (remainingKeyPath === '') {
        if (value === undefined) {
          if (Array.isArray(obj) && !isNaN(parseInt(currentKeyPath))) {
            obj.splice(currentKeyPath, 1);
          } else {
            delete obj[currentKeyPath];
          }
        } else {
          obj[currentKeyPath] = value;
        }
      } else {
        obj[currentKeyPath] = obj[currentKeyPath] || {};
        setByKeyPath(obj[currentKeyPath], remainingKeyPath, value);
      }
    } else {
      if (value === undefined) {
        if (Array.isArray(obj) && !isNaN(parseInt(keyPath))) {
          obj.splice(keyPath, 1);
        } else {
          delete obj[keyPath];
        }
      } else {
        obj[keyPath] = value;
      }
    }
  }
}

/*
const userDataMap = {
  'cmi.core.student_id': function(userData) {
    return userData.userId || '';
  },
  'cmi.core.student_name': function(userData) {
    return userData.userFullName || '';
  },
  'cmi.core.entry': function(userData) {
    if (userData.progress) {
      return userData.progress < 1 ? 'resume' : '';
    }
    return 'ab-initio';
  },
  'cmi.core.lesson_mode': function(userData) {
    if (userData.userId) {
      return userData.complete ? 'review' : 'normal';
    }
    return 'browse';
  },
  'cmi.core.credit': function(userData) {
    return userData.userId ? 'credit' : 'no-credit';
  },
  'cmi.student_preference.language': function(userData) {
    return userData.language ? userData.language : '';
  },
  'cmi.core.total_time': function(userData) {
    return userData.timeSpent ? userData.timeSpent : 0;
  },
};
*/

export default class SCORM extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
    this.nameSpace = 'SCORM';
    this.__setData = this.__setData.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
  }

  __setData(data = {}) {
    this.data = data;
  }

  iframeInitialize() {
    this.__setShimInterface();
    // window.parent is our own shim, so we use regular assignment
    // here to play nicely with the Proxy we are using.
    try {
      window.parent.API = this.shim;
    } catch (e) {
      if (e instanceof DOMException) {
        // If this is a result of trying to touch a secure property
        // this will be a DOMException error. Catch and just return nothing.
        logger.warn(
          'Tried to setup the SCORM API in a sandboxed environment, it will not be enabled'
        );
        return;
      }
      throw e;
    }
  }

  __setShimInterface() {
    const self = this;

    class Shim {
      LMSInitialize() {
        logger.log('LMS Initialize called');
        self.data.version = '1.2';
        self.stateUpdated();
        return TRUE;
      }

      LMSFinish() {
        logger.log('LMS Finish called');
        return TRUE;
      }
      LMSSetValue(CMIElement, value) {
        setByKeyPath(self.data, CMIElement, value);
        logger.log(`LMSSetValue called with path: ${CMIElement} and value ${value}`);
        self.stateUpdated();
        return TRUE;
      }

      LMSGetValue(CMIElement) {
        logger.log(`LMSGetValue called with path: ${CMIElement}`);
        if (childKeys[CMIElement]) {
          return childKeys[CMIElement];
        }
        if (emptyKeys[CMIElement]) {
          return '';
        }
        let value = getByKeyPath(self.data, CMIElement);
        if (!value) {
          // make sure we return an empty string rather than undefined, to be spec-compliant.
          value = '';
        }
        return value;
      }

      LMSCommit() {
        logger.log('LMS Commit called');
        return TRUE;
      }

      LMSGetLastError() {
        return NO_ERROR;
      }

      LMSGetErrorString(errorCode) {
        logger.log(`LMS Get Error String called with code ${errorCode}`);
        return '';
      }

      LMSGetDiagnostic(errorCode) {
        logger.log(`LMS Get Diagnostic called with code ${errorCode}`);
        return '';
      }
    }
    this.shim = new Shim();

    return this.shim;
  }
}
