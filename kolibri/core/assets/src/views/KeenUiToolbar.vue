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

  /deep/ .ui-toolbar__right {
    // Improves UI on smaller screen where long
    // text in some languages (ie, the hint string in bg-bg)
    // would push the width of the screen rightward. Now the
    // content of this section will wrap internally instead of
    // expanding the parent container
    flex-shrink: 1;
  }

  /deep/ .ui-toolbar__left {
    margin-left: 16px;
  }

  .ui-toolbar {
    padding: 0 16px;
  }

</style>
