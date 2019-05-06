import Hashi from './iframeClient';
import { executePage } from './replaceScript';

const initialize = () => {
  try {
    require('./compat');
    const hashi = new Hashi();
    if (process.env.NODE_ENV !== 'production') {
      window.hashi = hashi;
      console.log('Hashi initialized!'); // eslint-disable-line no-console
    }
  } catch (e) {
    // Something went wrong, so attempt to execute the page
    executePage();
  }
};

initialize();
