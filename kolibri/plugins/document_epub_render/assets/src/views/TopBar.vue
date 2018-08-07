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

  .top-bar {
    z-index: 4;
    background-color: #eeeeee;
    box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

  .title {
    margin: 0;
    overflow: hidden;
    line-height: 36px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

</style>
