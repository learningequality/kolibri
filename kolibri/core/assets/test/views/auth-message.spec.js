/* eslint-env mocha */
const Vue = require('vue-test');
const assert = require('assert');
const AuthMessage = require('../../src/views/auth-message.vue');

function makeVm(options) {
  const Ctor = Vue.extend(AuthMessage);
  return new Ctor(options).$mount();
}

function getElements(vm) {
  return {
    loginCommand: () => vm.$el.querySelector('#login-command').innerText.trim(),
    loginPrompt: () => vm.$el.querySelector('#login-prompt').innerText.trim(),
  };
}

describe.only('auth message component', () => {
  it('shows the right command when authorized role is "learner"', () => {
    const vm = makeVm({ propsData: { authorizedRole: 'learner' } });
    const { loginCommand } = getElements(vm);
    assert.equal(
      loginCommand(),
      'You must be signed in as a Learner to view this page.'
    );
  });

  it('shows the right command when authorized role is "admin"', () => {
    const vm = makeVm({ propsData: { authorizedRole: 'admin' } });
    const { loginCommand } = getElements(vm);
    assert.equal(
      loginCommand(),
      'You must be signed in as an Admin to view this page.'
    );
  });

  it('shows right text when manually provided as prop', () => {
    const vm = makeVm({
      propsData: {
        prompt: 'Signed in as device owner',
        command: 'Cannot be used by device owner',
      },
    });

    const { loginCommand, loginPrompt } = getElements(vm);

    assert.equal(loginPrompt(), 'Signed in as device owner');
    assert.equal(loginCommand(), 'Cannot be used by device owner');
  });
});
