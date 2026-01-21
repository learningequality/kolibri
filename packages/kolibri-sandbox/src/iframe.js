import Sandbox from './iframeClient';

const sandbox = new Sandbox();
window.sandbox = sandbox;
// For backwards compatibility - some code expects 'hashi'
window.hashi = sandbox;
console.log('Sandbox initialized!'); // eslint-disable-line no-console
