/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import SignUpPage from '../../src/views/sign-up-page';
import makeStore from '../util/makeStore';

function makeWrapper() {
  return mount(SignUpPage, {
    store: makeStore(),
    router: new VueRouter(),
  });
}

describe('signUpPage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.isVueInstance()).to.be.true;
  });
});
