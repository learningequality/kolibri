/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import { mount } from '@vue/test-utils';
import DownloadButton from '../src/views/content-renderer/download-button.vue';

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
      it('should return an array of length equal to number of files', function() {
        const wrapper = mount(DownloadButton, {
          propsData: {
            files: samplesFiles,
          },
        });
        expect(wrapper.vm.fileOptions.length).to.equal(samplesFiles.length);
      });
    });
  });
});
