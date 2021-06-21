import 'core-js/es/array/includes';
import 'core-js/es/object/assign';
import 'core-js/es/object/entries';
import 'core-js/es/object/values';
import 'core-js/es/promise';
import 'core-js/es/string/starts-with';
import 'core-js/web/url';
import Hashi from './iframeClient';

const hashi = new Hashi();
window.hashi = hashi;
console.log('Hashi initialized!'); // eslint-disable-line no-console
