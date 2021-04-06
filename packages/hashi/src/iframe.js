import Hashi from './iframeClient';

require('./compat');

const hashi = new Hashi();
window.hashi = hashi;
console.log('Hashi initialized!'); // eslint-disable-line no-console
