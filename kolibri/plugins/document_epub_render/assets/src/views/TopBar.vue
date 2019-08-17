<template>

  <div class="top-bar" :style="{ backgroundColor: $themePalette.grey.v_200 }">
    <KGrid>
      <KGridItem
        :layout4="{ span: 1 }"
        :layout8="{ span: 2 }"
        :layout12="{ span: 3 }"
      >
        <TocButton
          ref="tocButton"
          @click="$emit('tableOfContentsButtonClicked')"
        />
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'center' }"
        :layout4="{ span: 1 }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <h2
          v-if="title"
          class="top-bar-title"
        >
          {{ title }}
        </h2>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout4="{ span: 2 }"
        :layout8="{ span: 2 }"
        :layout12="{ span: 3 }"
      >
        <SettingsButton
          ref="settingsButton"
          @click="$emit('settingsButtonClicked')"
        />

        <SearchButton
          ref="searchButton"
          @click="$emit('searchButtonClicked')"
        />

        <UiIconButton
          ref="fullscreenButton"
          type="secondary"
          :ariaLabel="$tr('toggleFullscreen')"
          @click="$emit('fullscreenButtonClicked')"
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

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import TocButton from './TocButton';
  import SettingsButton from './SettingsButton';
  import SearchButton from './SearchButton';

  export default {
    name: 'TopBar',
    components: {
      UiIconButton,
      TocButton,
      SettingsButton,
      SearchButton,
    },
    props: {
      title: {
        type: String,
        required: false,
      },
      isInFullscreen: {
        type: Boolean,
        required: true,
      },
    },
    methods: {
      /**
       * @public
       */
      focusOnTocButton() {
        this.$refs.tocButton.$el.focus();
      },
      /**
       * @public
       */
      focusOnSettingsButton() {
        this.$refs.settingsButton.$el.focus();
      },
      /**
       * @public
       */
      focusOnSearchButton() {
        this.$refs.searchButton.$el.focus();
      },
    },
    $trs: {
      toggleFullscreen: 'Toggle fullscreen',
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .top-bar {
    z-index: 1;
  }

  .top-bar-title {
    @include truncate-text;

    margin: 0;
    line-height: 36px;
  }

</style>
