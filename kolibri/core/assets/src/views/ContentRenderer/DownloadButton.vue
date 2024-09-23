<template>

  <KButton
    v-if="canDownload"
    ref="button"
    hasDropdown
    :primary="$attrs.primary"
  >
    <span>{{ $tr('downloadContent') }}</span>
    <template #menu>
      <KDropdownMenu
        :options="fileOptions"
        @select="download"
      />
    </template>
  </KButton>

</template>


<script>

  import useUser from 'kolibri.coreVue.composables.useUser';
  import { getFilePresetString } from './filePresetStrings';
  import { getRenderableFiles } from './utils';

  export default {
    name: 'DownloadButton',
    setup() {
      const { isAppContext } = useUser();

      return {
        isAppContext,
      };
    },
    props: {
      files: {
        type: Array,
        default: () => [],
      },
      nodeTitle: {
        type: String,
        default: '',
      },
    },
    computed: {
      downloadableFiles() {
        return getRenderableFiles(this.files).filter(file => file.preset !== 'exercise');
      },
      canDownload() {
        return !this.isAppContext && this.downloadableFiles.length;
      },
      fileOptions() {
        const options = this.files.map(file => {
          const label = getFilePresetString(file);
          const fileId =
            file.preset === 'video_subtitle' && file?.lang.lang_name
              ? file?.lang.lang_name
              : file.checksum.slice(0, 6);
          return {
            label,
            url: file.storage_url,
            fileName: this.$tr('downloadFilename', {
              resourceTitle: this.nodeTitle.length ? this.nodeTitle : file.checksum,
              fileExtension: file.extension,
              fileId,
            }),
          };
        });
        return options;
      },
    },
    methods: {
      download(file) {
        const a = document.createElement('a');
        a.download = file.fileName;
        a.href = file.url;
        document.body.appendChild(a);
        a.click();
        a.remove();
      },
    },
    $trs: {
      downloadContent: {
        message: 'Save to device',
        context:
          "The 'SAVE TO DEVICE' button allows learners to download learning resources, like a PDF document for example, to their own device.",
      },
      downloadFilename: {
        message: '{ resourceTitle } ({ fileId }).{ fileExtension }',
        context: 'DO NOT TRANSLATE\nCopy the source string.\n',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
