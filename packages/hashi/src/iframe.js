import 'core-js/es/array/includes';
import 'core-js/es/object/assign';
import 'core-js/es/object/entries';
import 'core-js/es/object/values';
import 'core-js/es/promise';
import Hashi from './iframeClient';

const hashi = new Hashi();
window.hashi = hashi;
console.log('Hashi initialized!'); // eslint-disable-line no-console
