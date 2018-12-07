<template>

  <KDropdownMenu
    :text="$tr('downloadContent')"
    :options="fileOptions"
    @select="download"
  />

</template>


<script>

  import filesize from 'filesize';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';

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
          label: `${file.preset} (${filesize(file.file_size)})`,
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
