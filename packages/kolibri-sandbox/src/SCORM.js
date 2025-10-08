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

const FALSE = 'false';

const BLANK = '';

const ERRORS = {
  NO_ERROR: 0,
  GENERAL_EXCEPTION: 101,
  INVALID_ARGUMENT_ERROR: 201,
  ELEMENT_CANNOT_HAVE_CHILDREN: 202,
  ELEMENT_NOT_AN_ARRAY: 203,
  NOT_INITIALIZED: 301,
  NOT_IMPLEMENTED_ERROR: 401,
  ELEMENT_IS_KEYWORD: 402,
  ELEMENT_IS_READ_ONLY: 403,
  ELEMENT_IS_WRITE_ONLY: 404,
  INCORRECT_DATA_TYPE: 405,
};

const READ_WRITE = {
  // For reverse lookup purposes, these constants must match
  RO: 'RO',
  RW: 'RW',
  WO: 'WO',
};

const CMIDecimal = {
  validate(value) {
    return !isNaN(value);
  },
};

// Not clear whether the hours and minutes are optional, but setting them as so for safety.
/* eslint-disable max-len */
const timeSpanRegex = /(?:([0-9]{4}|[0-9]{2}):)?(?:([0-5][0-9]):)?([0-5][0-9](?:\.[0-9]{1,2})?)/;
/* eslint-enable */

const CMITimeSpan = {
  validate(value) {
    return timeSpanRegex.test(value);
  },
  convertFromSeconds(seconds) {
    const format = value => (value < 10 ? '0' + value : value);
    // Round seconds to two decimal places
    const s = Math.round((seconds % 60) * 100) / 100;
    const m = Math.floor((seconds % 3600) / 60);
    const h = Math.floor(seconds / 3600);
    // CMITimeSpan has a limit of 4 digits for hours, so return ''
    // here for safety if the number is too large
    if (h >= 10000) {
      return '';
    }
    return `${format(h)}:${format(m)}:${format(s)}`;
  },
};

// This is a 24 hour clock time, so requires all digits.
/* eslint-disable max-len */
const timeRegex = /((?:[0-1][0-9]|2[0-3])):([0-5][0-9]):([0-5][0-9](?:\.[0-9]{1,2})?)/;
/* eslint-enable */

const CMITime = {
  validate(value) {
    return timeRegex.test(value);
  },
};

function isStringLike(value) {
  // Note: explicitly using double equals here instead of triple equals
  // to check that we have a coerceable type (so exclude undefined, null, and functions)
  return String(value) == value;
}

const CMIString255 = {
  validate(value) {
    return isStringLike(value) && String(value).length <= 255;
  },
};

const CMIString4096 = {
  validate(value) {
    return isStringLike(value) && String(value).length <= 4096;
  },
};

const CMIIdentifier = {
  validate(value) {
    // A 255 character string that does not contain any whitespace
    // The spec says 'alphanumeric' but seems like this commonly means more
    // than just [0-9a-zA-Z]:
    // https://moodle.org/mod/forum/discuss.php?d=52947
    return CMIString255.validate(value) && !/\s/.test(value);
  },
};

const lowerCaseLetterNumber = /[0-9a-z]/;

function singleLowerCaseLetterNumber(s) {
  return s.length === 1 && lowerCaseLetterNumber.test(s);
}

const trueFalse = /[01tf]/;

const CMIFeedback = {
  validate(value, obj) {
    if (value === BLANK) {
      return true;
    } else if (!isStringLike(value)) {
      return false;
    }
    // Coerce the value to a string for validation
    value = String(value);
    if (obj.type === 'true-false') {
      // Single character matching the valid true false characters
      return trueFalse.test(value) && value.length === 1;
    }
    if (obj.type === 'choice') {
      // Choice is comma separated list of 0-9 and a-z
      // Can also be wrapped in curly braces
      if (value[0] === '{') {
        if (value[value.length - 1] === '}') {
          value = value.substring(1, value.length - 1);
        } else {
          return false;
        }
      }
      return value.split(',').every(singleLowerCaseLetterNumber);
    }
    if (obj.type === 'fill-in' || obj.type === 'performance') {
      // Ensure it doesn't exceed the max length
      if (value.length <= 255) {
        return true;
      }
      return false;
    }
    if (obj.type === 'numeric') {
      // Just validate that it's a number
      return CMIDecimal.validate(value);
    }
    if (obj.type === 'likert') {
      // A single lower case letter number character
      return singleLowerCaseLetterNumber(value);
    }
    if (obj.type === 'matching') {
      // Like the choice type, except that the comma separated
      // values are pairs separted by '.'
      // e.g. 'a.b,1.c'
      if (value[0] === '{') {
        if (value[value.length - 1] === '}') {
          value = value.substring(1, value.length - 1);
        } else {
          return false;
        }
      }
      return value.split(',').every(s => {
        return s.length === 3 && s.split('.').every(singleLowerCaseLetterNumber);
      });
    }
    if (obj.type === 'sequencing') {
      // Comma separated list of single characters
      return value.split(',').every(singleLowerCaseLetterNumber);
    }
    // No type, return true as we can't validate
    return true;
  },
};

const SCORE_SCHEMA = {
  hasChildren: true,
  raw: {
    type: CMIDecimal,
    readWrite: READ_WRITE.RW,
  },
  min: {
    type: CMIDecimal,
    readWrite: READ_WRITE.RW,
  },
  max: {
    type: CMIDecimal,
    readWrite: READ_WRITE.RW,
  },
};

const STATUS_SCHEMA = {
  readWrite: READ_WRITE.RW,
  values: {
    passed: 'passed',
    completed: 'completed',
    failed: 'failed',
    incomplete: 'incomplete',
    browsed: 'browsed',
    'not attempted': 'not attempted',
    '': '',
  },
};

const SCHEMA = {
  cmi: {
    hasChildren: true,
    core: {
      hasChildren: true,
      student_id: {
        type: CMIIdentifier,
        fromUserData(userData) {
          return userData.userId || '';
        },
        readWrite: READ_WRITE.RO,
      },
      student_name: {
        type: CMIString255,
        fromUserData(userData) {
          return userData.userFullName || '';
        },
        readWrite: READ_WRITE.RO,
      },
      lesson_location: {
        type: CMIString255,
        readWrite: READ_WRITE.RW,
      },
      credit: {
        fromUserData(userData) {
          return userData.userId ? 'credit' : 'no-credit';
        },
        readWrite: READ_WRITE.RO,
      },
      lesson_status: STATUS_SCHEMA,
      entry: {
        fromUserData(userData) {
          if (userData.progress) {
            return userData.progress < 1 ? 'resume' : '';
          }
          return 'ab-initio';
        },
        readWrite: READ_WRITE.RO,
      },
      score: SCORE_SCHEMA,
      total_time: {
        type: CMITimeSpan,
        fromUserData(userData) {
          return CMITimeSpan.convertFromSeconds(userData.timeSpent ? userData.timeSpent : 0);
        },
        readWrite: READ_WRITE.RO,
      },
      lesson_mode: {
        fromUserData(userData) {
          if (userData.userId) {
            return userData.complete ? 'review' : 'normal';
          }
          return 'browse';
        },
        readWrite: READ_WRITE.RO,
      },
      exit: {
        readWrite: READ_WRITE.WO,
        values: {
          'time-out': 'time-out',
          suspend: 'suspend',
          logout: 'logout',
          '': '',
        },
      },
      session_time: {
        type: CMITimeSpan,
        readWrite: READ_WRITE.WO,
      },
    },
    launch_data: {
      type: CMIString4096,
      readWrite: READ_WRITE.RO,
    },
    comments: {
      type: CMIString4096,
      readWrite: READ_WRITE.RW,
    },
    comments_from_lms: {
      type: CMIString4096,
      readWrite: READ_WRITE.RO,
    },
    objectives: {
      hasChildren: true,
      arraySchema: {
        id: {
          type: CMIIdentifier,
          readWrite: READ_WRITE.RW,
        },
        score: SCORE_SCHEMA,
        status: STATUS_SCHEMA,
      },
    },
    // We don't currently support any of the student_data subkeys
    student_data: {
      hasChildren: true,
      mastery_score: {
        notImplemented: true,
        readWrite: READ_WRITE.RO,
      },
      max_time_allowed: {
        notImplemented: true,
        readWrite: READ_WRITE.RO,
      },
      time_limit_action: {
        notImplemented: true,
        readWrite: READ_WRITE.RO,
      },
    },
    student_preference: {
      hasChildren: true,
      language: {
        type: CMIString255,
        fromUserData(userData) {
          return userData.language ? userData.language : '';
        },
        readWrite: READ_WRITE.RW,
      },
      audio: {
        notImplemented: true,
        readWrite: READ_WRITE.RW,
      },
      speed: {
        notImplemented: true,
        readWrite: READ_WRITE.RW,
      },
      text: {
        notImplemented: true,
        readWrite: READ_WRITE.RW,
      },
    },
    interactions: {
      hasChildren: true,
      arraySchema: {
        id: {
          type: CMIIdentifier,
          readWrite: READ_WRITE.RW,
        },
        objectives: {
          arraySchema: {
            id: {
              type: CMIIdentifier,
              readWrite: READ_WRITE.WO,
            },
          },
        },
        time: {
          type: CMITime,
          readWrite: READ_WRITE.WO,
        },
        type: {
          readWrite: READ_WRITE.WO,
          values: {
            'true-false': 'true-false',
            choice: 'choice',
            'fill-in': 'fill-in',
            matching: 'matching',
            performance: 'performance',
            sequencing: 'sequencing',
            likert: 'likert',
            numeric: 'numeric',
            '': '',
          },
        },
        correct_responses: {
          arraySchema: {
            pattern: {
              readWrite: READ_WRITE.WO,
            },
          },
        },
        weighting: {
          type: CMIDecimal,
          readWrite: READ_WRITE.WO,
        },
        student_response: {
          type: CMIFeedback,
          readWrite: READ_WRITE.WO,
        },
        result: {
          readWrite: READ_WRITE.WO,
          validate(value) {
            const values = {
              correct: 'correct',
              wrong: 'wrong',
              unanticipated: 'unanticipated',
              neutral: 'neutral',
              '': '',
            };
            return CMIDecimal.validate(value) || values[value];
          },
        },
        latency: {
          readWrite: READ_WRITE.WO,
          type: CMITimeSpan,
        },
      },
    },
    suspend_data: {
      type: CMIString4096,
      readWrite: READ_WRITE.RW,
    },
  },
};

const SCORM_ERROR_NAME = 'SCORMError';

function throwError(errorCode) {
  const error = TypeError(errorCode);
  error.name = SCORM_ERROR_NAME;
  throw error;
}

// Vendored and modified from
// https://github.com/dfahlander/Dexie.js/blob/2337c0fcb093219c07723f81363b806d203f5c8b/src/functions/utils.ts#L118

export function getByKeyPath(obj, keyPath, localSchema, userData) {
  // If a keyPath is empty, if no schema exists for it, or if it is not a string
  // throw an invalid argument error.
  if (!keyPath || !localSchema || typeof keyPath !== 'string') {
    throwError(ERRORS.INVALID_ARGUMENT_ERROR);
  }
  // If we are trying to read from a write only property, throw an error
  if (localSchema[keyPath] && localSchema[keyPath].readWrite === READ_WRITE.WO) {
    throwError(ERRORS.ELEMENT_IS_WRITE_ONLY);
  }
  // If we have defined how this is derived from user data that is fed in from
  // Kolibri, then return this value instead of looking for it in our data object.
  if (localSchema[keyPath] && localSchema[keyPath].fromUserData) {
    return localSchema[keyPath].fromUserData(userData);
  }
  // http://www.w3.org/TR/IndexedDB/#steps-for-extracting-a-key-from-a-value-using-a-key-path
  // This works for getting values from Objects by key and from Arrays by index
  if (obj && Object.prototype.hasOwnProperty.call(obj, keyPath)) {
    return obj[keyPath];
  }
  const period = keyPath.indexOf('.');
  // If there is a separator still in the keyPath
  if (period !== -1) {
    const leadingKeyPath = keyPath.substr(0, period);
    const innerObj = obj ? obj[leadingKeyPath] : obj;
    const innerKeyPath = keyPath.substr(period + 1);
    let innerSchema = localSchema[leadingKeyPath];
    if (innerSchema && innerSchema.arraySchema) {
      // If the inner schema is for an array, pass
      // the arraySchema instead
      innerSchema = innerSchema.arraySchema;
    } else if (!isNaN(leadingKeyPath)) {
      // If the path is indexing into an array,
      // we keep the array schema from the parent
      innerSchema = localSchema;
    }
    if (innerKeyPath === '_count') {
      // If the inner key is requesting a count, we check that we have a valid schema
      // for the keyPath up until this point, and check that this is for an array in the schema
      if (localSchema[leadingKeyPath] && localSchema[leadingKeyPath].arraySchema) {
        // It is, so first we check if the data object has an array
        if (Array.isArray(innerObj)) {
          // If so, return this array's length
          return innerObj.length;
        } else {
          // If not, it is effectively a zero length array
          return 0;
        }
      } else {
        // Otherwise, they tried to get the length of an element that is not an array in the
        // schema - throw the appropriate error.
        throwError(ERRORS.ELEMENT_NOT_AN_ARRAY);
      }
    }
    if (innerKeyPath === '_children') {
      // If the inner key is requesting the children, check to see that we have a valid schema
      // for the keyPath up until this point, and check that this has children
      if (localSchema[leadingKeyPath] && localSchema[leadingKeyPath].hasChildren) {
        // If so, return the child keys of the appropriate inner schema (by using innerSchema
        // we can expose the children of array properties as well).
        return (
          Object.keys(innerSchema)
            // Filter out the `hasChildren` key which is our own special marker.
            // Also filter out keys that we have not implemented yet.
            .filter(key => key !== 'hasChildren' && !innerSchema[key].notImplemented)
            .join(',')
        );
      } else {
        // Otherwise, they tried to get the children of a property that does not allow it
        // throw the appropriate error.
        throwError(ERRORS.ELEMENT_CANNOT_HAVE_CHILDREN);
      }
    }
    // Recurse further to get the data we are after.
    return getByKeyPath(innerObj, innerKeyPath, innerSchema, userData);
  }
  // If we have got to this point, we do not a representation of the relevant
  // keyPath in the object, and we have finished recursing through the keyPath
  // Check if the remaining keyPath is in the schema at all and if we support it
  if (localSchema[keyPath] && !localSchema[keyPath].notImplemented) {
    // If so, just return a blank response, which is always valid.
    return BLANK;
  } else if (localSchema[keyPath] && localSchema[keyPath].notImplemented) {
    // If it is in the schema but not implemented, return the appropriate error
    throwError(ERRORS.NOT_IMPLEMENTED_ERROR);
  }
  // Otherwise, this is not a valid argument, so throw here.
  throwError(ERRORS.INVALID_ARGUMENT_ERROR);
}

export function setByKeyPath(obj, keyPath, value, localSchema) {
  // Can't set blank keyPaths on non-existent schemas that are not strings!
  if (!keyPath || !localSchema || typeof keyPath !== 'string') {
    throwError(ERRORS.INVALID_ARGUMENT_ERROR);
  }
  // Check to see if we still need to recurse the keyPath
  const period = keyPath.indexOf('.');
  if (period !== -1) {
    // If so, get the first part of the keyPath before the first separator
    const leadingKeyPath = keyPath.substr(0, period);
    // Get the remainder of the keyPath after the first separator
    const innerKeyPath = keyPath.substr(period + 1);
    // Try getting the relevant subsection of the schema for this subsection
    // of the keyPath
    let innerSchema = localSchema[leadingKeyPath];
    if (innerSchema && innerSchema.arraySchema) {
      // If the inner schema is for an array, pass
      // the arraySchema instead
      innerSchema = innerSchema.arraySchema;
      // Set the inner object to an Array here, to prevent it
      // being set to an object later:
      obj[leadingKeyPath] = obj[leadingKeyPath] || [];
    } else if (!isNaN(leadingKeyPath)) {
      // If the path is indexing into an array,
      // we keep the array schema from the parent
      innerSchema = localSchema;
    }
    // If the remaining key path we are after is either for a count or children
    // we can raise an error here, as we are not allowed to set these.
    if (innerKeyPath === '_count' || innerKeyPath === '_children') {
      throwError(ERRORS.ELEMENT_IS_KEYWORD);
    }
    // In case we have not set any data in this part of the object before,
    // initialize the key to a blank object if not already initialized.
    obj[leadingKeyPath] = obj[leadingKeyPath] || {};
    // Recurse the key path setting!
    setByKeyPath(obj[leadingKeyPath], innerKeyPath, value, innerSchema);
  } else {
    const innerSchema = localSchema[keyPath];
    // If we are trying to write to a read only property, throw an error
    if (innerSchema && innerSchema.readWrite === READ_WRITE.RO) {
      throwError(ERRORS.ELEMENT_IS_READ_ONLY);
    }
    // If we are trying to write to a property we have not implemented, throw an error
    if (innerSchema && innerSchema.notImplemented) {
      throwError(ERRORS.NOT_IMPLEMENTED_ERROR);
    }
    // If we are trying to write to a property that does not exist on the schema, throw an error
    if (!innerSchema) {
      throwError(ERRORS.INVALID_ARGUMENT_ERROR);
    }
    // Conduct validation based on the schema we have inferred.
    if (
      // First check if we have a defined type and run validation against it
      (innerSchema.type && !innerSchema.type.validate(value, obj)) ||
      // If there is a directly defined validation function on the schema,
      // check that
      (innerSchema.validate && !innerSchema.validate(value, obj)) ||
      // If the schema defines a set of allowed values, check that it is
      // included.
      (innerSchema.values && !innerSchema.values[value]) ||
      // Otherwise, if there is no defined type and nothing else is set for
      // validation, just check that the value is valid as a string.
      (!innerSchema.type && !isStringLike(value))
    ) {
      throwError(ERRORS.INCORRECT_DATA_TYPE);
    }
    // If we've got this far, we can set the value!
    obj[keyPath] = value;
  }
}

const statusProgressMap = {
  passed: 1,
  failed: 0.5,
  browsed: 0.5,
  'not attempted': 0,
  incomplete: 0.5,
};

export default class SCORM extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
    this.userData = {};
    this.nameSpace = 'SCORM';
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
    const score = getByKeyPath(this.data, 'cmi.core.score', SCHEMA, self.userData);
    if (score) {
      // If min and max are not set, raw will be a value in the range 0-100. Source:
      // https://support.scorm.com/hc/en-us/articles/206166466-cmi-score-raw-whole-numbers-
      const min = Number(isNaN(score.min) ? 0 : score.min);
      const max = Number(isNaN(score.max) ? 100 : score.max);
      const raw = Number(isNaN(score.raw) ? min : score.raw);
      return Math.max(Math.min((raw - min) / (max - min), 1), 0);
    }
    const lessonStatus = getByKeyPath(this.data, 'cmi.core.lesson_status', SCHEMA, self.userData);
    if (Object.prototype.hasOwnProperty.call(statusProgressMap, lessonStatus)) {
      return statusProgressMap[lessonStatus];
    }
    // Return null if we have no progress information to report.
    return null;
  }

  iframeInitialize(contentWindow) {
    this.__setShimInterface();
    contentWindow.API = this.shim;
  }

  __setShimInterface() {
    const self = this;

    let error = ERRORS.NO_ERROR;

    class Shim {
      LMSInitialize() {
        logger.debug('LMS Initialize called');
        self.stateUpdated();
        return TRUE;
      }

      LMSFinish() {
        logger.debug('LMS Finish called');
        return TRUE;
      }
      LMSSetValue(CMIElement, value) {
        error = ERRORS.NO_ERROR;
        logger.debug(`LMSSetValue called with path: ${CMIElement} and value ${value}`);
        try {
          setByKeyPath(self.data, CMIElement, value, SCHEMA);
        } catch (e) {
          if (e instanceof TypeError && e.name === SCORM_ERROR_NAME) {
            error = e.message;
            return FALSE;
          }
          throw e;
        }
        self.stateUpdated();
        return TRUE;
      }

      LMSGetValue(CMIElement) {
        error = ERRORS.NO_ERROR;
        logger.debug(`LMSGetValue called with path: ${CMIElement}`);
        try {
          return getByKeyPath(self.data, CMIElement, SCHEMA, self.userData);
        } catch (e) {
          if (e instanceof TypeError && e.name === SCORM_ERROR_NAME) {
            error = e.message;
            return BLANK;
          }
          throw e;
        }
      }

      LMSCommit() {
        error = ERRORS.NO_ERROR;
        logger.debug('LMS Commit called');
        return TRUE;
      }

      LMSGetLastError() {
        return error;
      }

      LMSGetErrorString(errorCode) {
        logger.debug(`LMS Get Error String called with code ${errorCode}`);
        return BLANK;
      }

      LMSGetDiagnostic(errorCode) {
        logger.debug(`LMS Get Diagnostic called with code ${errorCode}`);
        return BLANK;
      }
    }
    this.shim = new Shim();

    return this.shim;
  }
}
