<script>

  import UiToolbar from 'kolibri-design-system/lib/keen/UiToolbar';

  export default {
    name: 'KeenUiToolbar',
    extends: UiToolbar,
  };

</script>


<style lang="scss" scoped>

  /deep/ .ui-toolbar__nav-icon {
    margin-right: 27px;
    margin-left: -5px;
  }

  /deep/ .ui-toolbar__title {
    overflow: hidden;
    white-space: nowrap;
  }

</style>
