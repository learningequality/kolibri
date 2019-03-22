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

// JSDOM does not proxy the iframe name attribute through to the contained
// window like a regular browser does, so we have to add this special case
// just for tests.
if (window.name === nameSpace || window.name === 'nodejs') {
  // We are in the main hashi window, initialize hashi before doing
  // anything else
  initialize();
} else {
  // Otherwise, we are in a different iframe, just load the current page
  // straight away.
  patchXMLHttpRequest();
  loadCurrentPage();
}
