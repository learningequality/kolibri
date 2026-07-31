<template>

  <ViewerToolbar
    class="top-bar"
    :isInFullscreen="isInFullscreen"
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
    },
    methods: {
      /**
       * Moves keyboard focus to the table of contents button.
       * @public
       */
      focusOnTocButton() {
        this.$refs.tocButton.$el.focus();
      },
      /**
       * Moves keyboard focus to the settings button.
       * @public
       */
      focusOnSettingsButton() {
        this.$refs.settingsButton.$el.focus();
      },
      /**
       * Moves keyboard focus to the search button.
       * @public
       */
      focusOnSearchButton() {
        this.$refs.searchButton.$el.focus();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .top-bar-title {
    @include truncate-text;

    margin: 0;
    line-height: 36px;
  }

</style>
