/* eslint-env mocha */
const Vue = require('vue-test');
const sinon = require('sinon');
const assert = require('assert');
const roleSwitcherComponent = require('../../src/views/class-edit-page/role-switcher.vue');


describe.only('role-switcher component', () => {
  it('renders correctly when currentRole is admin', () => {
    const Ctor = Vue.extend(roleSwitcherComponent);
    const vm = new Ctor({
      propsData: {
        currentRole: 'admin',
      },
    }).$mount();
    assert.equal(vm.$el.textContent.trim(), 'Admin');
  });

  it('renders correctly when currentRole is learner', () => {
    const Ctor = Vue.extend(roleSwitcherComponent);
    const vm = new Ctor({
      propsData: {
        currentRole: 'learner',
      },
    }).$mount();
    assert(vm.$el.querySelector('button[name="learner"]'));
  });
});
