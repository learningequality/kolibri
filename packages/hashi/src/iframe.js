import Hashi from './iframeClient';
import { nameSpace } from './hashiBase';
import loadCurrentPage from './loadCurrentPage';
import patchXMLHttpRequest from './monkeyPatchXMLHttpRequest';

require('./compat');

const initialize = () => {
  const hashi = new Hashi();
  if (process.env.NODE_ENV !== 'production') {
    window.hashi = hashi;
    console.log('Hashi initialized!'); // eslint-disable-line no-console
  }
};

if (window.name === nameSpace) {
  // We are in the main hashi window, initialize hashi before doing
  // anything else
  initialize();
} else {
  // Otherwise, we are in a different iframe, just load the current page
  // straight away.
  patchXMLHttpRequest();
  loadCurrentPage();
}
