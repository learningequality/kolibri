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

  /deep/ .ui-toolbar__left {
    margin-left: 16px;
  }

  .ui-toolbar {
    padding: 0 16px;
  }

</style>
