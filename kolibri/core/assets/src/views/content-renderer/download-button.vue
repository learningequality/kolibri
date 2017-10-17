<template>

  <dropdown-menu
    :name="$tr('downloadContent')"
    :options="fileOptions"
    icon="file_download"
    @select="download"
  />

</template>


<script>

  import filesize from 'filesize';
  import dropdownMenu from 'kolibri.coreVue.components.dropdownMenu';
  export default {
    name: 'downloadButton',
    components: { dropdownMenu },
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
        window.location.href = file.url;
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
