import Mediator from '../../src/mediator';

const live = [];

/**
 * Construct a Mediator that destroyMediators will tear down.
 * @param {Window} remote - The window messages are sent to
 * @returns {Mediator} The tracked mediator
 */
export function createMediator(remote) {
  const mediator = new Mediator(remote);
  live.push(mediator);
  return mediator;
}

/**
 * Destroy every mediator createMediator made. Each listens on the shared jsdom window,
 * so one left alive takes the messages later tests post.
 */
export function destroyMediators() {
  for (const mediator of live.splice(0)) {
    mediator.destroy();
  }
}
