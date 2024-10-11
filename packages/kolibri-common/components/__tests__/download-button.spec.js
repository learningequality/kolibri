import { mount } from '@vue/test-utils';
import DownloadButton from '../DownloadButton';

jest.mock('kolibri/urls');

describe('download-button Component', function () {
  const samplesFiles = [
    {
      file_size: 100000,
      preset: 'high_res_video',
      extension: 'mp4',
      checksum: '3893fd801427402ad07487c5d2d35119',
    },
    {
      file_size: 500,
      preset: 'thumbnail',
      extension: 'jpg',
      checksum: '187598e1f4596bf4492f5a205922b633',
    },
  ];

  describe('computed property', function () {
    describe('fileOptions', function () {
      it('should return an array of length equal to number of files', function () {
        const wrapper = mount(DownloadButton, {
          propsData: {
            files: samplesFiles,
          },
        });
        expect(wrapper.vm.fileOptions.length).toEqual(samplesFiles.length);
      });
    });
  });
});
