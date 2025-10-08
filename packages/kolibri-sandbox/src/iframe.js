import 'core-js/es/array/includes';
import 'core-js/es/object/assign';
import 'core-js/es/object/entries';
import 'core-js/es/object/values';
import 'core-js/es/promise';
import 'core-js/es/string/starts-with';
import 'core-js/web/url';
import Sandbox from './iframeClient';

const sandbox = new Sandbox();
window.sandbox = sandbox;
// For backwards compatibility - some code expects 'hashi'
window.hashi = sandbox;
console.log('Sandbox initialized!'); // eslint-disable-line no-console
