/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import { mount } from 'avoriaz';
import ProfilePage from '../../src/views/profile-page';
import makeStore from '../util/makeStore';

ProfilePage.vuex.actions.fetchPoints = () => {};

function makeWrapper() {
  return mount(ProfilePage, {
    store: makeStore(),
  });
}

describe('profilePage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    assert(wrapper.isVueComponent);
  });
});
