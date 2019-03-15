import Hashi from './iframeClient';

require('./compat');

const initialize = () => {
  const hashi = new Hashi();
  if (process.env.NODE_ENV !== 'production') {
    window.hashi = hashi;
    console.log('Hashi initialized!'); // eslint-disable-line no-console
  }
};

initialize();
