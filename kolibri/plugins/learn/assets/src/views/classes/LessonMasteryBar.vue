<template>

  <UiToolbar
    :title="appBarTitle"
    textColor="black"
    type="clear"
    :style="{ backgroundColor: $themeTokens.surface }"
    class="header-container"
    removeNavIcon="true"
  >
    <div class="inner-header">
      <KFixedGrid numCols="2">
        <KFixedGridItem span="1" :style="{ backgroundColor: 'purple', margin: 'auto' }">
          <OverallStatus />
        </KFixedGridItem>
        <KFixedGridItem
          span="1"
          alignment="right"
          :style="{ backgroundColor: 'yellow', margin: 'auto' }"
        >
          <Hint />
        </KFixedGridItem>
      </KFixedGrid>
    </div>
  </UiToolbar>

</template>


<script>

  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import OverallStatus from './OverallStatus';
  import Hint from './Hint';

  export default {
    name: 'LessonMasteryBar',
    components: {
      OverallStatus,
      Hint,
      UiToolbar,
    },
    props: {
      appBarTitle: {
        type: String,
        required: true,
      },
    },
    computed: {},
    methods: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .header-container {
    position: fixed;
    right: 0;
    left: 0;
    z-index: 8; // material - Bottom app bar
    height: 63px;
    padding: 8px 16px;
    margin: 0;
    overflow-x: hidden;
    font-size: 14px;
    border: 1px red solid;
  }

  .inner-header {
    width: 100%;
    height: 100%;
    padding: 0 20px;
    margin: auto;
    border: 1px blue solid;
  }

</style>
