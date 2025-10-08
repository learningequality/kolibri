/**
 * This module creates utilities for validating xAPI statements
 *
 * For more information, see:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md
 */
import 'core-js/features/set';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isFunction from 'lodash/isFunction';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import { validate as validateUUID, v4 as uuidv4 } from 'uuid';
import { parse as parseDuration } from 'iso8601-duration';
import { IRI } from 'iri';
import dayjs from 'dayjs';
import { isLangCode } from 'is-language-code';
import {
  OBJECT_TYPES,
  ObjectTypeChoices,
  INTERACTION_TYPES,
  InteractionTypeChoices,
  interactionOptionsLookup,
  OUTER_DELIMITER,
  INNER_DELIMITER,
  RANGE_DELIMITER,
  CMI_INTERACTION,
} from './xAPIConstants';

const logging = console; //elsint-disable-line no-console

/*
 * Custom error to trigger when validation fails
 * Use ES5 compatible subclassing for compatibility.
 * Use this instead of a built in error to be sure
 * that validation errors in tests are actually because
 * of failed validation and not code errors.
 */
export function xAPIValidationError(message, fileName, lineNumber) {
  var instance = new Error(message, fileName, lineNumber);
  instance.name = 'xAPIValidationError';
  Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
  if (Error.captureStackTrace) {
    Error.captureStackTrace(instance, xAPIValidationError);
  }
  return instance;
}

xAPIValidationError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: Error,
    enumerable: false,
    writable: true,
    configurable: true,
  },
});

if (Object.setPrototypeOf) {
  Object.setPrototypeOf(xAPIValidationError, Error);
} else {
  xAPIValidationError.__proto__ = Error;
}

/*
 * Utility functions to help with validation
 */

/*
 * Number turns empty string into 0 and so
 * does lodash toNumber - we want to treat
 * blank string differently due to the semantics
 * of the xAPI/SCORM numeric format.
 */
function toNumber(value) {
  return value === '' ? NaN : Number(value);
}

/*
 * Helper function to parse the xAPI/SCORM numeric format
 * Can be a single digit, an unbounded range, or a bounded range
 * e.g.:
 * 7 - number 7
 * 7[:] - 7 and up
 * [:]7 - up to and including 7
 * 4[:]7 - 4 to 7 inclusive
 */
function numericValid(r) {
  const [start, end] = r.split(RANGE_DELIMITER);
  const startNumber = toNumber(start);
  // Single number only case, no delimiter used.
  if (isUndefined(end)) {
    return !isNaN(startNumber);
  }
  // If we have got here, there is a delimiter
  const endNumber = toNumber(end);
  if (start === '') {
    // Range unbounded on the lower end
    return !isNaN(endNumber);
  }
  if (end === '') {
    // Range unbounded on the upper end
    return !isNaN(startNumber);
  }
  if (!isNaN(startNumber) && !isNaN(endNumber)) {
    // Both are numbers, so just check that this is
    // a valid range.
    return startNumber < endNumber;
  }
  // No other success cases, so must have failed.
  return false;
}

/*
 * Calculate how many mutually exclusive IFI fields have been defined
 * on an object.
 */
const numIFI = o =>
  Boolean(o.mbox) + Boolean(o.mbox_sha1sum) + Boolean(o.openid) + Boolean(o.account);

/*
 * Validator objects.
 * Most of the validator objects are plain objects with a
 * test and msg method - test returns true or false for whether
 * the attribute passes validation, msg returns the error message
 *
 * test accepts up to three parameters - value, key, and whole object
 * msg accepts up to two parameters - key, and whole object
 * warn - an optional boolean property, if true, this will only log a warning
 *        and not fail validation - useful for properties that MAY be enforced in the spec
 */

/*
 * The first validators are just Javascript Regex objects that have an
 * additional msg method defined on them, so already have the test method
 * defined.
 */

const mboxRegex = /^mailto:[^@]+@[^@]+$/;
mboxRegex.msg = attr => `${attr} does not start with mailto: or is not a valid email address`;

// SHA-1 Hashes have a bit length of 160, giving a 40 digit hex
const sha1Validator = /^[a-f0-9]{40}$/;
sha1Validator.msg = attr => `${attr} is not a valid SHA1 sum`;

/*
 * SHA-2 is a family of hash functions:
 * SHA-224 - bit length 224, 56 digit hex
 * SHA-256 - bit length 256, 64 digit hex
 * SHA-384 - bit length 384, 96 digit hex
 * SHA-512 - bit length 512, 128 digit hex
 * SHA-512/224 - bit length 224, 56 digit hex
 * SHA-512/256 - bit length 256, 64 digit hex
 */
const sha2Validator = /^([a-f0-9]{56}|[a-f0-9]{64}|[a-f0-9]{96}|[a-f0-9]{128})$/;
sha2Validator.msg = attr => `${attr} is not a valid SHA2 hash`;

/*
 * Validators for basic Javascript types
 * These will often be used in conjunction with other
 * validators to prevent having to type check in subsequent validation
 */

const arrayValidator = {
  test: isArray,
  msg: attr => `${attr} must be an array`,
};

const arrayOrObjectValidator = {
  test: v => isArray(v) || isPlainObject(v),
  msg: attr => `${attr} must be an array or object`,
};

const booleanValidator = {
  test: isBoolean,
  msg: attr => `${attr} must be a boolean`,
};

const numberValidator = {
  test: isNumber,
  msg: attr => `${attr} must be a number`,
};

const objectValidator = {
  test: isPlainObject,
  msg: attr => `${attr} must be an object`,
};

const stringValidator = {
  test: isString,
  msg: attr => `${attr} must be a string`,
};

/*
 * Additional 'primitive' types defined here:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#special-data
 * and in various ietf.org RFCs
 */

const mimeTypeValidator = /\w+\/[-.\w]+(?:\+[-.\w]+)?/;
mimeTypeValidator.msg = attr => `${attr} is not a valid mimetype`;

const languageValidator = {
  test: v => isLangCode(v).res,
  msg: (attr, o) => `${attr} is not a valid language code because: ${isLangCode(o[attr]).message}`,
};

const languageMapValidator = {
  test: v => Object.entries(v).every(([k, s]) => isLangCode(k).res && isString(s)),
  msg: attr => `${attr} is not a valid LanguageMap`,
};

const IRIValidator = {
  test: v => {
    const iri = new IRI(v);
    return iri.scheme() && iri.hierpart() && iri.authority();
  },
  msg: attr => `${attr} is not a valid IRI`,
};

const IRLValidator = {
  test: v => {
    const iri = new IRI(v);
    return (iri.scheme() && iri.hierpart() && iri.authority()) || iri.path();
  },
  msg: attr => `${attr} is not a valid IRL`,
};

const durationValidator = {
  test: v => {
    try {
      parseDuration(v);
      return true;
    } catch (e) {
      return false;
    }
  },
  msg: attr => `${attr} must be an ISO 8601 duration`,
};

const timestampValidator = {
  test: v => {
    const d = dayjs(v);
    return d.isValid();
  },
  msg: attr => `${attr} must be an ISO 8601 timestamp`,
};

const UUIDValidator = {
  test: validateUUID,
  msg: attr => `${attr} must be a valid UUID`,
};

/*
 * These validators are specific to encoding SCORM based CMI interaction types.
 * Detailed here: https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#interaction-activities
 */

const interactionTypeValidator = {
  test: v => InteractionTypeChoices.has(v),
  msg: attr => `${attr} was set as an invalid interaction type`,
};

/*
 * Some interaction types do not take any other parameters
 * and the specification enforces that these should not be passed
 * alongside these types - this validator enforces that.
 */
const noOptionsValidator = {
  test: (v, k, o) => {
    return interactionOptionsLookup[k].has(o.interactionType);
  },
  msg: (key, o) => `${key} specified but ${o.interactionType} does not support it`,
};

/*
 * This validates the correctResponses property - ensuring that
 * correctResponses are accurate when compared to the available
 * responses to the interaction.
 */
const correctResponsesValidator = {
  warn: true,
  test: (v, k, o) => {
    const interactionType = o.interactionType;
    const correctResponsesPattern = o.correctResponsesPattern;
    if (interactionType === INTERACTION_TYPES.TRUE_FALSE) {
      return correctResponsesPattern.every(r => r === 'true' || r === 'false');
    }
    if (
      interactionType === INTERACTION_TYPES.CHOICE ||
      interactionType === INTERACTION_TYPES.SEQUENCING
    ) {
      const choices = o.choices;
      const choiceIds = new Set(choices.map(c => c.id));
      return correctResponsesPattern.every(r => {
        const ids = r.split(OUTER_DELIMITER);
        return ids.every(id => choiceIds.has(id));
      });
    }
    if (interactionType === INTERACTION_TYPES.MATCHING) {
      const source = o.source;
      const target = o.target;
      const sourceIds = new Set(source.map(c => c.id));
      const targetIds = new Set(target.map(c => c.id));
      return correctResponsesPattern.every(r => {
        const pairs = r.split(OUTER_DELIMITER);
        return pairs.every(pair => {
          const [s, t] = pair.split(INNER_DELIMITER);
          return sourceIds.has(s) && targetIds.has(t);
        });
      });
    }
    if (interactionType === INTERACTION_TYPES.PERFORMANCE) {
      const steps = o.steps;
      const stepIds = new Set(steps.map(c => c.id));
      return correctResponsesPattern.every(r => {
        const pairs = r.split(OUTER_DELIMITER);
        return pairs.every(pair => {
          const [s] = pair.split(INNER_DELIMITER);
          return stepIds.has(s);
        });
      });
    }
    if (interactionType === INTERACTION_TYPES.LIKERT) {
      const scale = o.scale;
      const scaleIds = new Set(scale.map(c => c.id));
      return correctResponsesPattern.every(r => scaleIds.has(r));
    }
    if (interactionType === INTERACTION_TYPES.NUMERIC) {
      return correctResponsesPattern.every(numericValid);
    }
    return true;
  },
  msg: (key, o) => {
    const interactionType = o.interactionType;
    if (interactionType === INTERACTION_TYPES.TRUE_FALSE) {
      return 'true-false must take either true or false as the answer';
    }
    if (
      interactionType === INTERACTION_TYPES.CHOICE ||
      interactionType === INTERACTION_TYPES.SEQUENCING
    ) {
      return `${interactionType} must only use choice ids from the item`;
    }
    if (
      interactionType === INTERACTION_TYPES.FILL_IN ||
      interactionType === INTERACTION_TYPES.LONG_FILL_IN
    ) {
      return `${interactionType} must have no non blank answers`;
    }
    if (interactionType === INTERACTION_TYPES.MATCHING) {
      return 'matching must only use source and target ids from the item';
    }
    if (interactionType === INTERACTION_TYPES.PERFORMANCE) {
      return 'performance must only use step ids and fill-in or numeric responses';
    }
    if (interactionType === INTERACTION_TYPES.LIKERT) {
      return `${interactionType} must only use scale ids from the item`;
    }
    if (interactionType === INTERACTION_TYPES.NUMERIC) {
      return `${interactionType} must have valid numeric responses`;
    }
  },
};

/*
 * Validators specific to enforcing the correct objectType for objects
 * and ensuring that appropriate parameters are set depending on the objectType
 */
const objectTypeValidator = {
  test: v => isUndefined(v.objectType) || ObjectTypeChoices.has(v.objectType),
  msg: () => 'objectType must either be undefined or an allowed value',
};

const noSubStatement = {
  test: v => !v.objectType || v.objectType !== OBJECT_TYPES.SUBSTATEMENT,
  msg: () => 'object cannot be a SubStatement',
};

const authorityTypeValidator = {
  test: v => v.objectType === OBJECT_TYPES.AGENT || v.objectType === OBJECT_TYPES.GROUP,
  msg: () => 'authority must either be an Agent or a Group',
};

const authorityOAuthValidator = {
  test: v => v.objectType !== OBJECT_TYPES.GROUP || v.member.length === 2,
  msg: () => 'if authority is a group, must specify two member Agents',
};

const contextPropertyValidator = {
  /*
   * The "revision" Context property MUST only be used if the Statement's Object is an Activity.
   * The "platform" Context property MUST only be used if the Statement's Object is an Activity.
   */
  test: (v, k, o) => {
    // Object is an activity if it has no defined objectType or explicitly set as one
    if (isUndefined(v.objectType) || v.objectType === OBJECT_TYPES.ACTIVITY) {
      // In this case, no further validation needed.
      return true;
    }
    // Check that context does not have either for these values
    return (
      isUndefined(o.context) || (isUndefined(o.context.revision) && isUndefined(o.context.platform))
    );
  },
};

/*
 * Enforce no whitespace
 */
const noWhiteSpaceValidator = {
  test: v => !/\s/.test(v),
  msg: attr => `${attr} must not contain whitespace`,
};

/*
 * Score object validators
 */
const scaledValidator = {
  test: v => -1 <= v && 1 >= v,
  msg: attr => `${attr} must be in the range -1 to 1 inclusive`,
};

const minValidator = {
  test: (v, k, o) => isUndefined(o.max) || v < o.max,
  msg: () => `min must be less than max`,
};

const maxValidator = {
  test: (v, k, o) => isUndefined(o.min) || v > o.min,
  msg: () => `max must be greater than min`,
};

const rawMinValidator = {
  test: (v, k, o) => isUndefined(o.min) || v >= o.min,
  msg: () => 'raw must be greater than or equal to min',
};

const rawMaxValidator = {
  test: (v, k, o) => isUndefined(o.max) || v <= o.max,
  msg: () => 'raw must be less than or equal to max',
};

/*
 * Validation of the version property of the Statement object
 */
const versionValidator = {
  test: v => {
    const parts = v.split('.').map(toNumber);
    const [maj, min, pat] = parts;
    if (parts.length === 3 && !isNaN(maj) && !isNaN(min) && !isNaN(pat)) {
      return maj === 1 && min === 0;
    }
    return false;
  },
  msg: () => 'version must begin with 1.0 and be a semantic version',
};

/*
 * Use this to enforce properties that are explicitly _not_ allowed
 */
const notAllowed = {
  test: () => false,
  msg: attr => `${attr} was set but is not allowed`,
};

/*
 * Helper class to generate a validator that enforces a specific value
 */
class EnforceValue {
  constructor(value) {
    this.value = value;
  }

  test(v) {
    return v === this.value;
  }

  msg(attr, obj) {
    return `${attr} value did not match ${this.value} received ${obj[attr]}`;
  }
}

/*
 * This is the main class that drives validation.
 * Its constructor takes a single argument which is the specification
 * of the schema that is going to be validated against.
 * It has a single method 'clean' that iterates over this specification
 * and checks the passed in object against this specification.
 *
 * A specification is in this format:
 *
 * {
 *   keyname: {
 *     required:   Boolean|Function
 *                 whether this keyname is required or not, defaults to false,
 *                 if it is a Function it will be called with arguments:
 *                 value, key, object and should return a Boolean result.
 *     validators: Array
 *                 an Array of validators - objects with methods test and msg
 *                 these are applied in the order specified in the Array,
 *                 and an xAPIValidationError will be thrown as soon as one
 *                 fails.
 *     schema:     Schema|Function
 *                 A Schema to use for further cleaning. If it is a function,
 *                 it will be invoked with arguments value, key, object and
 *                 should return a Schema object. The Schema object will then
 *                 have its clean method called either on the value directly,
 *                 or if the value is an Array, it is called on each object
 *                 in the Array and an Array of results returned.
 *     clean:      Function that takes the output of any Schema based cleaning
 *                 and allows that to be updated. This is currently only used
 *                 to turn a single object into an array with one object to
 *                 handle legacy data requirements in xAPI:
 *                 https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#requirements-11
 *     default:    Function
 *                 If the value is not found on the object, this function will
 *                 be invoked to create the value.
 *   }
 * }
 *
 *
 */
class Schema {
  constructor(spec) {
    this.spec = spec;
  }
  clean(obj) {
    const output = {};
    for (const key in this.spec) {
      const keySpec = this.spec[key];
      let required = keySpec.required;
      if (isFunction(required)) {
        required = required(obj);
      }
      if (required && isUndefined(obj[key])) {
        throw new xAPIValidationError(`${key} required but not found`);
      }
      if (!isUndefined(obj[key])) {
        const validators = keySpec.validators || [];
        for (let i = 0; i < validators.length; i++) {
          const v = validators[i];
          if (!v.test(obj[key], key, obj)) {
            const msg = v.msg(key, obj);
            if (v.warn) {
              logging.warn(msg);
            } else {
              throw new xAPIValidationError(msg);
            }
          }
        }
        let schema = keySpec.schema;
        if (isFunction(schema)) {
          schema = schema(obj[key], key, obj);
        }
        if (schema && schema instanceof Schema) {
          try {
            if (isArray(obj[key])) {
              output[key] = obj[key].map(o => schema.clean(o));
            } else {
              output[key] = schema.clean(obj[key]);
            }
          } catch (e) {
            // Catch errors and rethrow to add path context to error message
            throw new xAPIValidationError(`in ${key}: ${e.message}`);
          }
        } else {
          output[key] = obj[key];
        }
        if (keySpec.clean) {
          output[key] = keySpec.clean(output[key]);
        }
      } else if (keySpec.default && isFunction(keySpec.default)) {
        output[key] = keySpec.default();
      }
    }
    return output;
  }
}

/*
 * Helper function to create a specification for IFI validation
 * which is used both for Agent and Group objects.
 * More info on IFI fields here:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#inversefunctional
 */
function IFISpecFactory(required) {
  let ifiValidator;
  if (required) {
    ifiValidator = {
      test: (v, k, o) => numIFI(o) === 1,
      msg: () => 'Did not supply exactly one IFI',
    };
  } else {
    ifiValidator = {
      test: (v, k, o) => numIFI(o) < 2,
      msg: () => 'Supplied more than one IFI',
    };
  }
  return {
    mbox: {
      required: o => !o.mbox_sha1sum && !o.openid && !o.account,
      validators: [ifiValidator, stringValidator, mboxRegex],
    },
    mbox_sha1sum: {
      required: o => !o.mbox && !o.openid && !o.account,
      validators: [ifiValidator, stringValidator, sha1Validator],
    },
    openid: {
      required: o => !o.mbox && !o.mbox_sha1sum && !o.account,
      validators: [ifiValidator, stringValidator],
    },
    account: {
      required: o => !o.mbox && !o.mbox_sha1sum && !o.openid,
      validators: [ifiValidator],
      schema: new Schema({
        homePage: {
          required: true,
          validators: [stringValidator],
        },
        name: {
          required: true,
          validators: [stringValidator],
        },
      }),
    },
  };
}

/*
 * Schema definitions for Actor objects, can either be an Agent
 * for an individual or Group for multiple users.
 */

export const Agent = new Schema({
  objectType: {
    validators: [stringValidator, new EnforceValue(OBJECT_TYPES.AGENT)],
  },
  name: {
    validators: [stringValidator],
  },
  ...IFISpecFactory(true),
});

export const Group = new Schema({
  objectType: {
    required: true,
    validators: [stringValidator, new EnforceValue(OBJECT_TYPES.GROUP)],
  },
  member: {
    required: obj => !numIFI(obj),
    validators: [arrayValidator],
    schema: Agent,
  },
  name: {
    validators: [stringValidator],
  },
  ...IFISpecFactory(false),
});

const Actor = o => (o.objectType === OBJECT_TYPES.GROUP ? Group : Agent);

/*
 * Verb definition:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#243-verb
 */
export const Verb = new Schema({
  id: {
    required: true,
    validators: [stringValidator, IRIValidator],
  },
  display: {
    validators: [objectValidator],
  },
});

/*
 * Schema definitions for Object types not already defined above:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#244-object
 */

/*
 * Used to define data about responses in CMI interaction types:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#interaction-components
 */
const InteractionComponent = new Schema({
  id: {
    required: true,
    validators: [stringValidator, noWhiteSpaceValidator],
  },
  description: {
    validators: [objectValidator, languageMapValidator],
  },
});

/*
 * ActivityDefinition Schema, used for defining
 * activities, with specific additional information
 * for SCORM CMI activities:
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#activity-definition
 */
export const ActivityDefinition = new Schema({
  name: {
    validators: [objectValidator, languageMapValidator],
  },
  description: {
    validators: [objectValidator, languageMapValidator],
  },
  type: {
    validators: [stringValidator, IRIValidator],
  },
  moreInfo: {
    validators: [stringValidator, IRLValidator],
  },
  extensions: {
    validators: [objectValidator],
  },
  interactionType: {
    required: o => o.type === CMI_INTERACTION,
    validators: [stringValidator, interactionTypeValidator],
  },
  choices: {
    schema: InteractionComponent,
    validators: [noOptionsValidator, arrayValidator],
    required: obj =>
      obj.interactionType === INTERACTION_TYPES.CHOICE ||
      obj.interactionType === INTERACTION_TYPES.SEQUENCING,
  },
  source: {
    schema: InteractionComponent,
    validators: [noOptionsValidator, arrayValidator],
    required: obj => obj.interactionType === INTERACTION_TYPES.MATCHING,
  },
  target: {
    schema: InteractionComponent,
    validators: [noOptionsValidator, arrayValidator],
    required: obj => obj.interactionType === INTERACTION_TYPES.MATCHING,
  },
  steps: {
    schema: InteractionComponent,
    validators: [noOptionsValidator, arrayValidator],
    required: obj => obj.interactionType === INTERACTION_TYPES.PERFORMANCE,
  },
  scale: {
    schema: InteractionComponent,
    validators: [noOptionsValidator, arrayValidator],
    required: obj => obj.interactionType === INTERACTION_TYPES.LIKERT,
  },
  correctResponsesPattern: {
    validators: [arrayValidator, correctResponsesValidator],
  },
});

/*
 * Activity Schema definition - used to describe activities that
 * statements are about.
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#2441-when-the-objecttype-is-activity
 */
export const Activity = new Schema({
  id: {
    validators: [stringValidator, IRIValidator],
  },
  objectType: {
    validators: [stringValidator, new EnforceValue(OBJECT_TYPES.ACTIVITY)],
  },
  definition: {
    schema: ActivityDefinition,
  },
});

/*
 * StatementRef Schema - used to refer to another statement
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#statement-references
 */
export const StatementRef = new Schema({
  id: {
    validators: [UUIDValidator],
  },
  objectType: {
    validators: [stringValidator, new EnforceValue(OBJECT_TYPES.STATEMENTREF)],
  },
});

/*
 * Helper function to return the correct Schema object depending
 * on the specified objectType value.
 */
export const ObjectSchema = o => {
  const objectType = o.objectType;
  if (!objectType || objectType === OBJECT_TYPES.ACTIVITY) {
    return Activity;
  }
  if (objectType === OBJECT_TYPES.AGENT) {
    return Agent;
  }
  if (objectType === OBJECT_TYPES.GROUP) {
    return Group;
  }
  if (objectType === OBJECT_TYPES.STATEMENTREF) {
    return StatementRef;
  }
  if (objectType === OBJECT_TYPES.SUBSTATEMENT) {
    return SubStatement;
  }
};

/*
 * Score Schema - used to describe the score of a result in a statement.
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#2451-score
 */
export const Score = new Schema({
  scaled: {
    validators: [numberValidator, scaledValidator],
  },
  min: {
    validators: [numberValidator, minValidator],
  },
  max: {
    validators: [numberValidator, maxValidator],
  },
  raw: {
    validators: [numberValidator, rawMinValidator, rawMaxValidator],
  },
});

/*
 * Result Schema - used to describe results from interactions.
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#245-result
 */
export const Result = new Schema({
  score: {
    schema: Score,
  },
  success: {
    validators: [booleanValidator],
  },
  completion: {
    validators: [booleanValidator],
  },
  response: {
    validators: [stringValidator],
  },
  duration: {
    validators: [durationValidator],
  },
  extensions: {
    validators: [objectValidator],
  },
});

// Helper function to return an object wrapped in an array if not already an array
const coerceToArray = o => (isArray(o) ? o : [o]);

/*
 * Context Schema - used to provide additional context to a Statement.
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#246-context
 */
export const Context = new Schema({
  registration: {
    validators: [UUIDValidator],
  },
  instructor: {
    schema: Agent,
  },
  team: {
    group: Group,
  },
  contextActivities: {
    schema: new Schema({
      parent: {
        schema: Activity,
        validators: [arrayOrObjectValidator],
        clean: coerceToArray,
      },
      grouping: {
        schema: Activity,
        validators: [arrayOrObjectValidator],
        clean: coerceToArray,
      },
      category: {
        schema: Activity,
        validators: [arrayOrObjectValidator],
        clean: coerceToArray,
      },
      other: {
        schema: Activity,
        validators: [arrayOrObjectValidator],
        clean: coerceToArray,
      },
    }),
  },
  revision: {
    validators: [stringValidator],
  },
  platform: {
    validators: [stringValidator],
  },
  language: {
    validators: [stringValidator, languageValidator],
  },
  statement: {
    schema: StatementRef,
  },
  extensions: {
    validators: [objectValidator],
  },
});

/*
 * Attachment Schema - used to describe information about file
 * attachments associated with the statement.
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#2411-attachments
 */
export const Attachment = new Schema({
  usageType: {
    required: true,
    validators: [IRIValidator],
  },
  display: {
    required: true,
    validators: [objectValidator, languageMapValidator],
  },
  description: {
    validators: [objectValidator, languageMapValidator],
  },
  contentType: {
    required: true,
    validators: [stringValidator, mimeTypeValidator],
  },
  length: {
    required: true,
    validators: [numberValidator],
  },
  sha2: {
    required: true,
    validators: [stringValidator, sha2Validator],
  },
  fileUrl: {
    validators: [stringValidator, IRLValidator],
  },
});

/* SubStatement Schema - used to create a statement that is nested inside another
 * another statement as an object.
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#substatements
 */
export const SubStatement = new Schema({
  id: {
    validators: [notAllowed],
  },
  objectType: {
    required: true,
    validators: [new EnforceValue(OBJECT_TYPES.SUBSTATEMENT)],
  },
  actor: {
    required: true,
    schema: Actor,
  },
  verb: {
    required: true,
    schema: Verb,
  },
  object: {
    required: true,
    validators: [objectTypeValidator, noSubStatement],
    schema: ObjectSchema,
  },
  result: {
    schema: Result,
  },
  context: {
    schema: Context,
  },
  timestamp: {
    validators: [timestampValidator],
  },
  attachments: {
    schema: Attachment,
    validators: [arrayValidator],
  },
  stored: {
    validators: [notAllowed],
  },
  version: {
    validators: [notAllowed],
  },
  authority: {
    validators: [notAllowed],
  },
});

/*
 * Statement Schema - the top level object and main entry
 * point for validation.
 * https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#statements
 */
export const Statement = new Schema({
  id: {
    validators: [UUIDValidator],
    default: uuidv4,
  },
  actor: {
    required: true,
    schema: Actor,
  },
  verb: {
    required: true,
    schema: Verb,
  },
  object: {
    required: true,
    validators: [objectTypeValidator, contextPropertyValidator],
    schema: ObjectSchema,
  },
  result: {
    schema: Result,
  },
  context: {
    schema: Context,
  },
  timestamp: {
    validators: [timestampValidator],
  },
  // We deliberately exclude the stored value here as it should only be supplied by the LRS
  // so we ignore anything coming in from the statement creator - this will then be set either
  // by us in the client side, or on the server when the statement is saved.
  authority: {
    schema: Actor,
    validators: [authorityTypeValidator, authorityOAuthValidator],
  },
  version: {
    validators: [stringValidator, versionValidator],
    default: () => '1.0.0',
  },
  attachments: {
    schema: Attachment,
    validators: [arrayValidator],
  },
});
