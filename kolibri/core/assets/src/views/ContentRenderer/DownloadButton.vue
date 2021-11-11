<template>

  <KDropdownMenu
    :text="$tr('downloadContent')"
    :options="fileOptions"
    @select="download"
  />

</template>


<script>

  import { getFilePresetString } from './filePresetStrings';

  export default {
    name: 'DownloadButton',
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
      fileOptions() {
        let options = this.files.map(file => {
          const label = getFilePresetString(file);
          return {
            label,
            url: file.storage_url,
            fileName: this.$tr('downloadFilename', {
              resourceTitle: this.nodeTitle,
              fileExtension: file.extension,
              fileId: file.checksum.slice(0, 6),
            }),
          };
        });
        return options;
      },
    },
    methods: {
      download(file) {
        const req = new XMLHttpRequest();
        req.open('GET', file.url, true);
        req.responseType = 'blob';

        req.onload = function() {
          const blob = req.response;
          const blobUrl = window.URL.createObjectURL(blob);
          try {
            const a = document.createElement('a');
            a.download = file.fileName;
            a.href = blobUrl;
            document.body.appendChild(a);
            a.click();
            a.remove();
          } catch (e) {
            window.open(file.url, '_blank');
          }
        };

        req.send();
      },
    },
    $trs: {
      downloadContent: {
        message: 'Download resource',
        context:
          "The 'DOWNLOAD RESOURCE' button allows learners to download learning resources, like a PDF document for example, to their own device.",
      },
      downloadFilename: {
        message: '{ resourceTitle } ({ fileId }).{ fileExtension }',
        context: 'DO NOT TRANSLATE\nCopy the source string.\n',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
