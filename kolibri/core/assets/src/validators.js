import values from 'lodash/values';
import { ContentNodeKinds, LearningActivities } from 'kolibri.coreVue.vuex.constants';
import every from 'lodash/every';
import keys from 'lodash/keys';

/**
 * Validation for vue router "location descriptor objects".
 * See e.g. https://router.vuejs.org/en/api/router-link.html
 */
export function validateLinkObject(object) {
  const validKeys = ['name', 'path', 'params', 'query'];
  return every(keys(object), key => validKeys.includes(key));
}

export function validateUsername(username) {
  const hasPuncRe = /[\s`~!@#$%^&*()\-+={}\[\]\|\\\/:;"'<>,\.\?]/; // eslint-disable-line
  return !hasPuncRe.test(username);
}

export function validateContentNodeKind(value, others = []) {
  return [...values(ContentNodeKinds), ...others].includes(value);
}

export function validateLearningActivity(arr) {
  const isValidLearningActivity = v => Object.values(LearningActivities).includes(v);
  return arr.length > 0 && arr.every(isValidLearningActivity);
}

export function objectPropValidator( options ){
	var args = arguments || [];
    var _getType = function(variable) {
        var match = false;
        var rawType = "";
        try {
            match = variable && variable.toString().match(/^\s*function (\w+)/);
        } catch {}
        try {
            rawType = Object.prototype.toString.call(variable).slice(8, -1);
        } catch {}
        return match ? match[1] : (rawType.length > 0 ? rawType : ((typeof variable == "function" || typeof variable.name != "undefined") ? variable.name : ''));
    };
    var _isUndefined = function(variable) {
        return (typeof variable === "undefined");
    };
    var _isSet = function(variable) {
        return (typeof variable !== "undefined");
    };
    var _isString = function(variable) {
        return (typeof variable === "string");
    };
    var _isNumber = function(variable) {
        return (typeof variable === "number");
    };
    var _isFinite = function(variable) {
        return isFinite(variable);
    };
    var _isInfinity = function(variable) {
        return (typeof variable === "number" && !isFinite(variable));
    };
    var _isBoolean = function(variable) {
        return (typeof variable === "boolean");
    };
    var _isBigInt = function(variable) {
        return (typeof variable === "bigint");
    };
    var _isFlatten = function(variable) {
        return (typeof variable === "string" || typeof variable === "number" || typeof variable === "boolean");
    };
    var _isEmpty = function(variable) {
        if (typeof variable === 'undefined' || variable === "" || variable === 0 || variable === [] || variable === {} || variable === false || variable === null || isNaN(variable) || variable === function() {}) {
            return true;
        }
        return false;
    };
    var _isArray = function(variable) {
        if (typeof Array != "undefined" && typeof Array.isArray != "undefined") {
            return Array.isArray(variable);
        }
        if (variable.constructor && variable.constructor.name && variable.constructor.name == "Array") {
            return true;
        }
        if (typeof Object != "undefined" && Object.prototype && Object.prototype.toString && Object.prototype.toString.call && Object.prototype.toString.call(variable) == "[object Array]"); {
            return true;
        }
        return false;
    };
    var _inArray = function(needle, haystack) {
        if (typeof haystack.indexOf != "undefined") {
            return haystack.indexOf(needle) > -1;
        }
        return false;
    };
    var _isFunction = function(variable) {
        return (typeof variable === "function");
    };
    var _isObject = function(variable) {
        return (typeof variable === "object");
    };
    var _isPureObject = function(variable) {
        return (typeof variable === "object" && typeof Object != "undefined" && variable === Object(variable));
    };
    var _isSymbol = function(variable) {
        return (typeof variable === "undefined");
    };
    var _isRegularType = function(variable) {
        var regularTypes = [String, Number, Boolean, Function, BigInt, Object, Array, Symbol];
        var regularTypesStr = ['String', 'Number', 'Boolean', 'Function', 'BigInt', 'Object', 'Array', 'Symbol'];
        if (regularTypes.indexOf(variable) > -1) {
            return true;
        }
        if (regularTypesStr.indexOf(variable) > -1) {
            return true;
        }
        return false;
    };
    var validatorLogger = function(msg, dataType, option, config, dataKey) {
        var dataMsg = "CURRENT DATA TYPE: " + dataType;
        var optMsg = "NEED DATA TYPE";
        switch (true) {
            case _isUndefined(option.type): {
                optMsg += ": Undefined";
            }
            break;
			case _isArray(option.type): {
				if (option.type.length <= 1) {
					optMsg += ": " + (_isSet(option.type[0]) ? _getType(option.type[0]) : "Undefined");
				} else {
					optMsg += "(in): [";
					for (var i = 0; i < option.type.length; i++) {
						optMsg += _getType(option.type[i]).toLowerCase();
					}
					optMsg.slice(0, -1);
					optMsg += "]";
				}
			}
        	break;
			default: {
				optMsg += _getType(option.type).toLowerCase();
			}
			break;
        }
        var finalMessage = "[Error](objectPropValidator): " + msg;
        if ("Required type mismatch" === msg) {
            finalMessage += ". Correction need: " + dataMsg + ", " + optMsg;
        }
        finalMessage += ". Key name: " + dataKey + ".";

        // Logger function check, ensure and call
        if (!(_isSet(config.logLevel) && config.logLevel === null)) {

            if (_isSet(config.logLevel) && config.logLevel == "throw") {
                if (_isSet(Error)) {
                    throw new Error(finalMessage);
                } else {
                    throw finalMessage;
                }
            } else if (_isUndefined(config.logLevel) || (_isSet(config.logLevel) && !console.hasOwnProperty(config.logLevel))) {
                config.logLevel = "error";
            }
            try {
                console[config.logLevel](finalMessage);
            } catch (err) {
                console.error(finalMessage);
            }

        }
    };
    var validator = function(data, option, config, dataKey) {
        var dataType = typeof data;
        dataType = dataType.toLowerCase();
        // If data is not available but need to required
        if (_isUndefined(data) && (_isSet(option.required) && option.required && _isSet(option.type) && !_isEmpty(option.type))) {
            validatorLogger("Required but undefined data", dataType, option, config, dataKey);
            return false;
        }
        if (_isSet(data) && (_isSet(option.validator) && _isFunction(option.validator) && !option.validator(data))) {
            validatorLogger("Validator function isn't valid", dataType, option, config, dataKey);
            return false;
        }
        if (_isSet(data) && (_isSet(option.validator) && !option.validator)) {
            validatorLogger("Validator isn't valid", dataType, option, config, dataKey);
            return false;
        }
        if (_isSet(option.type)) {
            if (!_isArray(option.type)) {
                option.type = [option.type];
            }
            var optionType = [];
            for (var i = 0; i < option.type.length; i++) {
                optionType = optionType.concat(_getType(option.type).toLowerCase());
            }
            if (!_inArray(dataType, optionType)) {
                validatorLogger("Required type mismatch", dataType, option, config, dataKey);
                return false;
            }
        }
        if (_isUndefined(option.required) || (_isSet(option.required) && option.required === false)) {
            return true;
        }
        return true;
    };
	var config = ( _isSet(args[1]) && _isObject(args[1]) ? args[1] : {
		enabled: true,
		logLevel: 'error'	} );

	return function(values) {
		if (!config.enabled) return true; // skip validations if disabled
		//if (!_isObject(values)) return false; // Check is object or return false
		for (var key in options) {
			var data = values[key];
			var option = options[key];
			if (option == null) continue;
			if (_isObject(option)) {
				objectPropValidator(option, config)(data);
				validator(data, option, config, key);
			}
		}
		return true;
	};
}
