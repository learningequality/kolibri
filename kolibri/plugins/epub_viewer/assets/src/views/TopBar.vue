<template>

  <div
    class="top-bar"
    :style="{ backgroundColor: $themePalette.grey.v_300 }"
  >
    <KGrid :style="{ marginTop: '2px', marginLeft: '3px', marginRight: '3px' }">
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
          :class="{ invisible: $attrs.hideSearchButton }"
          @click="$emit('searchButtonClicked')"
        />

        <KIconButton
          ref="fullscreenButton"
          :icon="isInFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          :ariaLabel="$tr('toggleFullscreen')"
          size="small"
          @click="$emit('fullscreenButtonClicked')"
        />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import TocButton from './TocButton';
  import SettingsButton from './SettingsButton';
  import SearchButton from './SearchButton';

  export default {
    name: 'TopBar',
    components: {
      TocButton,
      SettingsButton,
      SearchButton,
    },
    props: {
      title: {
        type: String,
        default: null,
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
      toggleFullscreen: {
        message: 'Toggle fullscreen',
        context:
          'Learners can use the fullscreen button in the upper right corner to open the ebook in fullscreen view.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .invisible {
    // When the SearchSideBar is shown, hide this SearchButton so it does not appear
    // under the second SearchButton rendered inside EpubRendererIndex
    opacity: 0;
  }

  .top-bar {
    z-index: 1;
  }

  .top-bar-title {
    @include truncate-text;

    margin: 0;
    line-height: 36px;
  }

</style>
