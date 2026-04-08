<template>

  <ViewerToolbar
    class="top-bar"
    :isInFullscreen="isInFullscreen"
    :embedded="embedded"
    @toggleFullscreen="$emit('fullscreenButtonClicked')"
  >
    <template #left>
      <TocButton
        ref="tocButton"
        @click="$emit('tableOfContentsButtonClicked')"
      />
    </template>
    <template #center>
      <h2
        v-if="title"
        class="top-bar-title"
      >
        {{ title }}
      </h2>
    </template>
    <template #right>
      <SettingsButton
        ref="settingsButton"
        @click="$emit('settingsButtonClicked')"
      />
      <SearchButton
        ref="searchButton"
        :class="{ invisible: hideSearchButton }"
        @click="$emit('searchButtonClicked')"
      />
    </template>
  </ViewerToolbar>

</template>


<script>

  import ViewerToolbar from 'kolibri-common/components/ViewerToolbar';
  import TocButton from './TocButton';
  import SettingsButton from './SettingsButton';
  import SearchButton from './SearchButton';

  export default {
    name: 'TopBar',
    components: {
      ViewerToolbar,
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
      embedded: {
        type: Boolean,
        default: false,
      },
      hideSearchButton: {
        type: Boolean,
        default: false,
      },
    },
    methods: {
      /**
       * Moves keyboard focus to the table of contents button.
       * @public
       */
      focusOnTocButton() {
        if (this.$refs.tocButton) {
          this.$refs.tocButton.$el.focus();
        }
      },
      /**
       * Moves keyboard focus to the settings button.
       * @public
       */
      focusOnSettingsButton() {
        if (this.$refs.settingsButton) {
          this.$refs.settingsButton.$el.focus();
        }
      },
      /**
       * Moves keyboard focus to the search button.
       * @public
       */
      focusOnSearchButton() {
        if (this.$refs.searchButton) {
          this.$refs.searchButton.$el.focus();
        }
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

  .top-bar-title {
    @include truncate-text;

    margin: 0;
    line-height: 36px;
  }

</style>
