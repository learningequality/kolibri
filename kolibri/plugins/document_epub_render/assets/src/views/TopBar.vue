<template>

  <div class="top-bar">
    <KGrid>
      <KGridItem
        sizes="25, 25, 25"
        :percentage="true"
        alignment="left"
      >
        <UiIconButton
          type="secondary"
          @click="$emit('tableOfContentsClicked')"
        >
          <mat-svg
            name="list"
            category="action"
          />
        </UiIconButton>
      </KGridItem>
      <KGridItem
        sizes="25, 50, 50"
        :percentage="true"
        alignment="center"
      >
        <h2 class="title">{{ title }}</h2>
      </KGridItem>
      <KGridItem
        sizes="50, 25, 25"
        :percentage="true"
        alignment="right"
      >
        <UiIconButton
          type="secondary"
          @click="$emit('settingsClicked')"
        >
          <mat-svg
            name="settings"
            category="action"
          />
        </UiIconButton>
        <UiIconButton
          type="secondary"
          @click="$emit('searchClicked')"
        >
          <mat-svg
            name="search"
            category="action"
          />
        </UiIconButton>

        <UiIconButton
          type="secondary"
          @click="$emit('fullscreenClicked')"
        >
          <mat-svg
            v-if="isInFullscreen"
            name="fullscreen_exit"
            category="navigation"
          />
          <mat-svg
            v-else
            name="fullscreen"
            category="navigation"
          />
        </UiIconButton>

      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'TopBar',
    components: {
      KGrid,
      KGridItem,
      UiIconButton,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      isInFullscreen: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './epub';

  .top-bar {
    z-index: 4;
    background-color: $core-grey-200;
    box-shadow: $epub-box-shadow;
  }

  .title {
    margin: 0;
    overflow: hidden;
    line-height: 36px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

</style>
