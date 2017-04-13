/* eslint-env mocha */
const Vue = require('vue-test');
const simulant = require('simulant');
const ConfigPage = require('../../src/views/facilities-config-page');

function makeWrapper(propsData) {
  const Ctor = Vue.extend(ConfigPage);
  return new Ctor({ propsData }).$mount();
}

function getElements(wrapper) {
  return {
    checkbox: wrapper.$el.querySelector('input[name="edit_username"]'),
  };
}

describe.only('facility config page view', () => {
  it('clicking checkboxes dispatches a modify action', (done) => {
    const wrapper = makeWrapper({});
    const els = getElements(wrapper);
    simulant.fire(els.checkbox, 'change');
    Vue.nextTick(() => {
      simulant.fire(els.checkbox, 'change');
      Vue.nextTick(() => {
        simulant.fire(els.checkbox, 'change');
        done();
      });
    });
  });
});
