<script>

  import UiToolbar from 'kolibri-design-system/lib/keen/UiToolbar';

  export default {
    name: 'KeenUiToolbar',
    extends: UiToolbar,
  };

</script>


<style lang="scss" scoped>

  /deep/ .ui-toolbar__title {
    overflow: hidden;
    white-space: nowrap;
  }

  .ui-toolbar {
    padding: 0 16px 0 30px;
  }

</style>
