/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

import Vue from 'vue-test'; // eslint-disable-line
import downloadButton from '../src/views/content-renderer/download-button.vue';

const DownloadButtonComponent = Vue.extend(downloadButton);
import assert from 'assert';

describe('download-button Component', function() {
  const samplesFiles = [
    {
      file_size: 100000,
      preset: 'High Resolution',
      download_url: '/downloadcontent/3893fd801427402ad07487c5d2d35119.mp4/Math_Low_Resolution.mp4',
    },
    {
      file_size: 500,
      preset: 'Thumbnail',
      download_url: '/downloadcontent/187598e1f4596bf4492f5a205922b633.jpg/Math_Thumbnail.jpg',
    },
  ];

  describe('computed property', function() {
    describe('fileOptions', function() {
      beforeEach(function() {
        this.vm = new DownloadButtonComponent({
          propsData: {
            files: samplesFiles,
          },
        }).$mount();
      });
      it('should return an array of length equal to number of files', function() {
        assert.equal(this.vm.fileOptions.length, samplesFiles.length);
      });
    });
  });
});
