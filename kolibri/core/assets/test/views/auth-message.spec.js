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
    headerText: () => vm.$el.querySelector('.AuthorizationMsg h1').innerText.trim(),
    detailsText: () => vm.$el.querySelector('.AuthorizationMsg p').innerText.trim(),
  };
}

describe.only('auth message component', () => {
  it('shows the right command when authorized role is "learner"', () => {
    const vm = makeVm({ propsData: { authorizedRole: 'learner' } });
    const { detailsText } = getElements(vm);
    assert.equal(detailsText(), 'You must be signed in as a Learner to view this page.');
  });

  it('shows the right command when authorized role is "admin"', () => {
    const vm = makeVm({ propsData: { authorizedRole: 'admin' } });
    const { detailsText } = getElements(vm);
    assert.equal(detailsText(), 'You must be signed in as an Admin to view this page.');
  });

  it('shows right text when both texts manually provided as prop', () => {
    const vm = makeVm({
      propsData: {
        header: 'Signed in as device owner',
        details: 'Cannot be used by device owner',
      },
    });

    const { headerText, detailsText } = getElements(vm);

    assert.equal(headerText(), 'Signed in as device owner');
    assert.equal(detailsText(), 'Cannot be used by device owner');
  });

  it('shows right text when one text manually provided as prop', () => {
    const vm = makeVm({
      propsData: {
        details: 'Must be device owner to manage content',
      },
    });

    const { headerText, detailsText } = getElements(vm);

    assert.equal(headerText(), 'Did you forget to sign in?');
    assert.equal(detailsText(), 'Must be device owner to manage content');
  });
});
