/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

'use strict';

const Vue = require('vue-test');
const Vuex = require('vuex');
const sessionNavWidget = require('../src/vue/session-nav-widget');
const SessionNavWidgetComponent = Vue.extend(sessionNavWidget);
const assert = require('assert');
const UserKinds = require('../src/constants').UserKinds;


describe('session-nav-widget component', function () {
  describe('computed properties', function () {
    beforeEach(function () {
      this.name = 'The Best User';
      this.username = 'and everyone knows it';
      this.store = new Vuex.Store({
        state: {
          core: {
            session: {
              kind: [],
              full_name: this.name,
              username: this.username,
            },
          },
        },
      });
      this.vm = new SessionNavWidgetComponent({ store: this.store }).$mount();
    });
    describe('initial', function () {
      beforeEach(function () {
        this.nameInitial = this.name[0].toUpperCase();
        this.usernameInitial = this.username[0].toUpperCase();
      });
      it('should return \'?\' if user has no name and is not superuser', function () {
        this.store.state.core.session.full_name = '';
        assert.equal(this.vm.initial, '?');
      });
      it(`should return ${this.usernameInitial} if user has no name and is superuser`, function () {
        this.store.state.core.session.full_name = '';
        this.store.state.core.session.kind = [UserKinds.SUPERUSER];
        assert.equal(this.vm.initial, this.usernameInitial);
      });
      it(`should return ${this.nameInitial} if user is a learner`, function () {
        this.store.state.core.session.kind = [UserKinds.LEARNER];
        assert.equal(this.vm.initial, this.nameInitial);
      });
      it(`should return ${this.nameInitial} if user has name and is a coach`, function () {
        this.store.state.core.session.kind = [UserKinds.COACH];
        assert.equal(this.vm.initial, this.nameInitial);
      });
      it(`should return ${this.nameInitial} if user has name and is an admin`, function () {
        this.store.state.core.session.kind = [UserKinds.ADMIN];
        assert.equal(this.vm.initial, this.nameInitial);
      });
      it(`should return ${this.usernameInitial} if user has name and is a superuser`, function () {
        this.store.state.core.session.kind = [UserKinds.SUPERUSER];
        assert.equal(this.vm.initial, this.usernameInitial);
      });
    });
    describe('name', function () {
      it('should return name if user has no kind', function () {
        assert.equal(this.vm.name, this.name);
      });
      it('should return name if user is a learner', function () {
        this.store.state.core.session.kind = [UserKinds.LEARNER];
        assert.equal(this.vm.name, this.name);
      });
      it('should return name if user is an admin', function () {
        this.store.state.core.session.kind = [UserKinds.ADMIN];
        assert.equal(this.vm.name, this.name);
      });
      it('should return name if user is a coach', function () {
        this.store.state.core.session.kind = [UserKinds.COACH];
        assert.equal(this.vm.name, this.name);
      });
      it('should return \'Device Owner\' if user is a superuser', function () {
        this.store.state.core.session.kind = [UserKinds.SUPERUSER];
        assert.equal(this.vm.name, this.vm.$tr('deviceOwner'));
      });
    });
    describe('userkind', function () {
      it('should be Admin if the string is \'Admin\'', function () {
        if (this.vm.userkind === this.vm.$tr('admin')) {
          assert.equal(this.vm.kind[0], UserKinds.ADMIN);
        }
      });
      it('should be Coach if the string is \'Coach\'', function () {
        if (this.vm.userkind === this.vm.$tr('coach')) {
          assert.equal(this.vm.kind[0], UserKinds.COACH);
        }
      });
      it('should be Superuser if the string is \'Superuser\'', function () {
        if (this.vm.userkind === this.vm.$tr('superuser')) {
          assert.equal(this.vm.kind[0], UserKinds.SUPERUSER);
        }
      });
      it('Should be Learner if the string is \'Learner\'', function () {
        if (this.vm.userkind === this.vm.$tr('learner')) {
          assert.equal(this.vm.kind.length, 0);
        }
      });
    });
    describe('logoutText', function () {});
  });
});
