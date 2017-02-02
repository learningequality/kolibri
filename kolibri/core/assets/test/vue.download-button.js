/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

'use strict';

const Vue = require('vue-test');
const downloadButton = require('../src/vue/content-renderer/download-button.vue');
const DownloadButtonComponent = Vue.extend(downloadButton);
const assert = require('assert');
const simulant = require('simulant');

describe('download-button Component', function () {
  const samplesFiles = [{
    file_size: 100000,
    preset: 'High Resolution',
    download_url: '/downloadcontent/3893fd801427402ad07487c5d2d35119.mp4/Math_Low_Resolution.mp4',
  }, {
    file_size: 500,
    preset: 'Thumbnail',
    download_url: '/downloadcontent/187598e1f4596bf4492f5a205922b633.jpg/Math_Thumbnail.jpg',
  }];


  describe('computed property', function () {
    describe('dropDownItems', function () {
      beforeEach(function () {
        this.vm = new DownloadButtonComponent({
          propsData: {
            files: samplesFiles,
          },
        }).$mount();
      });
      it('should return false if menu has never been opened', function () {
        assert.equal(this.vm.dropdownOpenText, 'false');
      });
      it('should return true after opening menu', function () {
        this.vm.toggleDropdown();
        assert.equal(this.vm.dropdownOpenText, 'true');
      });
      it('should return false after closing menu', function () {
        this.vm.toggleDropdown();
        this.vm.toggleDropdown();
        assert.equal(this.vm.dropdownOpenText, 'false');
      });
    });

    describe('focusableItems', function () {
      beforeEach(function () {
        this.vm = new DownloadButtonComponent({
          propsData: {
            files: samplesFiles,
          },
        }).$mount();
      });
      it('should return an array of length', function () {
        assert.equal(this.vm.focusableItems.length, this.vm.dropdownItems.length + 1);
      });
    });
  });

  describe('method', function () {
    describe('toggleDropdown', function () {
      beforeEach(function () {
        this.vm = new DownloadButtonComponent({
          propsData: {
            files: samplesFiles,
          },
        }).$mount();
      });
      it('should mark menu as open', function () {
        this.vm.toggleDropdown();
        assert.equal(this.vm.dropdownOpen, true);
        assert.equal(this.vm.focusedItemIndex, 0);
      });
      it('should mark menu as closed', function () {
        this.vm.toggleDropdown();
        this.vm.toggleDropdown();
        assert.equal(this.vm.dropdownOpen, false);
        assert.equal(this.vm.focusedItemIndex, 0);
      });
    });

    describe('handleKeys', function () {
      beforeEach(function () {
        this.vm = new DownloadButtonComponent({
          propsData: {
            files: samplesFiles,
          },
        }).$mount();
      });
      it('should ignore key input if dropdown is closed', function () {
        const downKey = simulant('keydown', { keyCode: 40 });
        simulant.fire(this.vm.$el, downKey);
        assert.equal(this.vm.focusedItemIndex, 0);
      });
      it('should ignore unrecognized key input', function () {
        const clickEvent = simulant('click');
        simulant.fire(this.vm.$refs.dropdownbutton, clickEvent);
        const zKey = simulant('keydown', { keyCode: 90 });
        simulant.fire(this.vm.$el, zKey);
        assert.equal(this.vm.focusedItemIndex, 0);
      });
      it('should handle the down key', function () {
        const clickEvent = simulant('click');
        simulant.fire(this.vm.$refs.dropdownbutton, clickEvent);
        const downKeyEvent = simulant('keydown', { keyCode: 40 });
        simulant.fire(document, downKeyEvent);
        assert.equal(this.vm.focusedItemIndex, 1);
      });
      it('should handle the up key', function () {
        const clickEvent = simulant('click');
        simulant.fire(this.vm.$refs.dropdownbutton, clickEvent);
        const downKeyEvent = simulant('keydown', { keyCode: 40 });
        const upKeyEvent = simulant('keydown', { keyCode: 38 });
        simulant.fire(document, downKeyEvent);
        simulant.fire(document, upKeyEvent);
        assert.equal(this.vm.focusedItemIndex, 0);
      });
      it('should handle the tab key', function () {
        const clickEvent = simulant('click');
        simulant.fire(this.vm.$refs.dropdownbutton, clickEvent);
        const tabKeyEvent = simulant('keydown', { keyCode: 9 });
        simulant.fire(document, tabKeyEvent);
        assert.equal(this.vm.focusedItemIndex, 1);
      });
      it('should handle the esc key', function () {
        const clickEvent = simulant('click');
        simulant.fire(this.vm.$refs.dropdownbutton, clickEvent);
        const escKeyEvent = simulant('keydown', { keyCode: 27 });
        simulant.fire(document, escKeyEvent);
        assert.equal(this.vm.dropdownOpen, false);
      });
    });

    describe('focusOnItem', function () {
      beforeEach(function () {
        this.vm = new DownloadButtonComponent({
          propsData: {
            files: samplesFiles,
          },
        }).$mount();
      });
      it('should focus on the correct item even if out of bounds', function () {
        this.vm.focusOnItem(100);
        assert.equal(this.vm.focusedItemIndex, 2);
      });
    });
  });
});

