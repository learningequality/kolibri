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
  };
}

describe('auth message component', () => {
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
});
