<template>

  <KDropdownMenu
    :text="$tr('downloadContent')"
    :options="fileOptions"
    @select="download"
  />

</template>


<script>

  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import { getFilePresetString } from './filePresetStrings';

  export default {
    name: 'DownloadButton',
    components: {
      KDropdownMenu,
    },
    $trs: { downloadContent: 'Download content' },
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
  };

</script>


<style lang="scss" scoped></style>
