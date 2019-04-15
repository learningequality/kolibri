/*
 * A dummy main client for use in integration tests.
 */

import Hashi from '../../src/mainClient';

const iframe = document.querySelector('#hashi');

window.hashi = new Hashi({ iframe });
