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
    },
    computed: {
      fileOptions() {
        return this.files.map(file => ({
          label: getFilePresetString(file),
          url: file.download_url,
        }));
      },
    },
    methods: {
      download(file) {
        window.open(file.url, '_blank');
      },
    },
    $trs: { downloadContent: 'Download resource' },
  };

</script>


<style lang="scss" scoped></style>
