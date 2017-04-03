/* eslint-env mocha */
const Vue = require('vue-test');
const assert = require('assert');
const roleSwitcherComponent = require('../../src/views/class-edit-page/role-switcher.vue');

function makeWrapper(propsData) {
  const Ctor = Vue.extend(roleSwitcherComponent);
  return new Ctor({ propsData }).$mount();
}

function getElements(wrapper) {
  return {
    learnerButton: wrapper.$el.querySelector('button[name="learner"]'),
    coachButton: wrapper.$el.querySelector('button[name="coach"]'),
  };
}

function hasPrimaryClass(el) {
  return Array.from(el.classList).find((x) => x.match(/--color-primary/));
}

describe('role-switcher component', () => {
  it('renders correctly when currentRole is admin', () => {
    const wrapper = makeWrapper({
      currentRole: 'admin',
    });
    assert.equal(wrapper.$el.textContent.trim(), 'Admin');
  });

  it('renders correctly when currentRole is learner', () => {
    const wrapper = makeWrapper({
      currentRole: 'learner',
    });
    const els = getElements(wrapper);
    assert(hasPrimaryClass(els.learnerButton));
    assert(!hasPrimaryClass(els.coachButton));
    assert.equal(els.learnerButton.getAttribute('disabled'), 'disabled');
    assert.equal(els.coachButton.getAttribute('disabled', undefined));
  });

  it('renders correctly when currentRole is coach', () => {
    const wrapper = makeWrapper({
      currentRole: 'coach',
    });
    const els = getElements(wrapper);
    assert(hasPrimaryClass(els.coachButton));
    assert(!hasPrimaryClass(els.learnerButton));
    assert.equal(els.coachButton.getAttribute('disabled'), 'disabled');
    assert.equal(els.learnerButton.getAttribute('disabled'), undefined);
  });
});
