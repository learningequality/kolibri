/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import { mount } from '@vue/test-utils';
import SignInPage from '../../src/views/sign-in-page';
import makeStore from '../util/makeStore';

function makeWrapper() {
  return mount(SignInPage, {
    store: makeStore(),
  });
}

describe('signInPage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.isVueInstance()).to.be.true;
  });
});
