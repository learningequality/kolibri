<template>

  <core-fullscreen
    ref="epubRenderer"
    class="epub-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <KLinearLoader
      v-show="!loaded"
      type="indeterminate"
      :delay="false"
    />
    <div v-show="loaded">
      <TopBar
        class="top-bar"
        :title="'Chapter Name'"
        :isInFullscreen="isInFullscreen"
        @tableOfContentsClicked="handleTocToggle"
        @settingsClicked="handleSettingToggle"
        @searchClicked="handleSearchToggle"
        @fullscreenClicked="$refs.epubRenderer.toggleFullscreen()"
      />


      <UiIconButton
        class="previous-button"
        type="secondary"
        :disableRipple="true"
        @click="goToPreviousPage"
      >
        <mat-svg
          v-if="isRtl"
          name="chevron_right"
          category="navigation"
        />
        <mat-svg
          v-else
          name="chevron_left"
          category="navigation"
        />
      </UiIconButton>
      <UiIconButton
        class="next-button"
        type="secondary"
        :disableRipple="true"
        @click="goToNextPage"
      >
        <mat-svg
          v-if="isRtl"
          name="chevron_left"
          category="navigation"
        />
        <mat-svg
          v-else
          name="chevron_right"
          category="navigation"
        />
      </UiIconButton>


      <TableOfContentsSideBar
        v-show="tocSideBarIsOpen"
        :toc="toc"
        class="side-bar side-bar-left"
        @tocNavigation="handleTocNavigation"
      />

      <SettingsSideBar
        v-show="settingsSideBarIsOpen"
        class="side-bar side-bar-right"
        :theme="theme"
        :textAlignment="textAlignment"
        @setFontSize="setFontSize"
        @setTheme="setTheme"
        @setTextAlignment="setTextAlignment"
      />


      <SearchSideBar
        v-show="searchSideBarIsOpen"
        ref="searchSideBar"
        class="side-bar side-bar-right"
        :book="book"
        @newSearchQuery="handleNewSearchQuery"
        @navigateToSearchResult="handleNavigateToSearchResult"
      />


      <div
        ref="epubjsContainer"
        class="epubjs-container"
        :class="epubjsContainerClass"
      >
      </div>

      <div class="slider-container d-t">
        <div class="d-t-r">

          <p class="d-t-c">
            {{ $tr('progress', { progress: progress / 100 }) }}
          </p>
          <div class="d-t-c max-width">
            <input
              class="slider"
              type="range"
              :min="sliderMin"
              :max="sliderMax"
              :step="sliderStep"
              v-model.lazy="progress"
            >
          </div>
        </div>

      </div>
    </div>
  </core-fullscreen>

</template>


<script>

  import { mapGetters } from 'vuex';

  import Epub from 'epubjs/src/epub';
  import manager from 'epubjs/src/managers/default';
  import iFrameView from 'epubjs/src/managers/views/iframe';

  import Mark from 'mark.js';

  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';

  import UiIconButton from 'keen-ui/src/UiIconButton';

  import TopBar from './TopBar';
  import TableOfContentsSideBar from './TableOfContentsSideBar';
  import SettingsSideBar from './SettingsSideBar';
  import SearchSideBar from './SearchSideBar';

  import { TEXT_ALIGNMENTS, THEMES } from './EPUB_RENDERER_CONSTANTS';

  const FONT_SIZE_INC = 2;
  const MIN_FONT_SIZE = 8;
  const DEFAULT_FONT_SIZE = 16;
  const MAX_FONT_SIZE = 24;

  const SIDE_BARS = {
    TOC: 'TOC',
    SEARCH: 'SEARCH',
    SETTINGS: 'SETTINGS',
  };

  export default {
    name: 'EpubRendererIndex',
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
      progress: `{progress, number, percent}`,
    },
    components: {
      UiIconButton,
      CoreFullscreen,
      TopBar,
      TableOfContentsSideBar,
      SettingsSideBar,
      SearchSideBar,
      KLinearLoader,
    },
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin],
    data: () => ({
      epubURL: 'http://localhost:8000/content/storage/epub3.epub',
      book: null,
      rendition: null,
      toc: [],
      sideBarOpen: null,
      theme: THEMES.WHITE,
      textAlignment: TEXT_ALIGNMENTS.LEFT,
      fontSize: DEFAULT_FONT_SIZE,
      isInFullscreen: false,
      totalPages: null,
      loaded: false,
      markInstance: null,
      searchQuery: null,
      progress: 0,
      locations: [],
    }),
    computed: {
      ...mapGetters(['sessionTimeSpent']),
      backgroundColor() {
        return this.theme.backgroundColor;
      },
      color() {
        return this.theme.textColor;
      },
      themeStyle() {
        return {
          body: {
            'background-color': this.backgroundColor,
            color: this.color,
            'font-size': `${this.fontSize}px`,
          },
          p: {
            'background-color': this.backgroundColor,
            color: this.color,
            'font-size': '1em',
            'text-align': this.textAlignment,
          },
          h1: {
            'font-size': '2.441em',
          },
          h2: {
            'font-size': '1.953em',
          },
          h3: {
            'font-size': '1.563em',
          },
          h4: {
            'font-size': '1.25em',
          },
          h5: {
            'font-size': '0.8em',
          },
          h6: {
            'font-size': '0.64em',
          },
          // mark: {
          //   'background-color': '#e2d1e0',
          //   'font-weight': 'bold',
          // },
        };
      },
      tocSideBarIsOpen() {
        return this.sideBarOpen === SIDE_BARS.TOC;
      },
      settingsSideBarIsOpen() {
        return this.sideBarOpen === SIDE_BARS.SETTINGS;
      },
      searchSideBarIsOpen() {
        return this.sideBarOpen === SIDE_BARS.SEARCH;
      },

      targetTime() {
        return this.totalPages * 30;
      },
      epubjsContainerClass() {
        const pushRightClass = 'epubjs-container-push-right';
        const pushLeftClass = 'epubjs-container-push-left';
        switch (this.sideBarOpen) {
          case SIDE_BARS.TOC:
            return pushRightClass;
          case SIDE_BARS.SETTINGS:
            return pushLeftClass;
          case SIDE_BARS.SEARCH:
            return pushLeftClass;
          default:
            return null;
        }
      },
      sliderMin() {
        return 0;
      },
      sliderMax() {
        return 100;
      },
      sliderStep() {
        return 100 / this.locations.length;
      },
    },
    watch: {
      themeStyle(newTheme) {
        if (this.rendition) {
          const themeName = JSON.stringify(newTheme);
          this.rendition.themes.register(themeName, newTheme);
          this.rendition.themes.select(themeName);
        }
      },
      sideBarOpen(sidebar) {
        if (sidebar === SIDE_BARS.SEARCH) {
          this.$nextTick().then(() => this.$refs.searchSideBar.focusOnInput());
          // this.highlightSearchQueryInEpub();
        }
      },
      elementHeight(newHeight) {
        if (this.loaded) {
          this.rendition.resize(300, newHeight);
        }
      },
      elementWidth(newWidth) {
        if (this.loaded) {
          this.rendition.resize(newWidth, 900);
        }
      },
      progress(newProgress) {
        const indexToJumpTo = Math.floor((this.locations.length - 1) * (newProgress / 100));
        const locationToJumpTo = this.locations[indexToJumpTo];
        this.rendition.display(locationToJumpTo);
      },
    },
    beforeMount() {
      global.ePub = Epub;
      this.book = new Epub(this.epubURL);
    },
    mounted() {
      this.book.ready
        .then(() => {
          this.rendition = this.book.renderTo(this.$refs.epubjsContainer, {
            manager,
            view: iFrameView,
            width: 500,
            height: 400,
          });
          // width\ height
          this.rendition.display().then(() => {
            // Loaded
            if (this.book.navigation) {
              this.toc = this.book.navigation.toc;
            }

            this.book.locations.generate().then(locations => {
              this.locations = locations;
              this.loaded = true;
            });

            // this.rendition.on('relocated', location => {
            //   console.log('relocated:', location);
            // });
            this.rendition.on('resized', size => {
              // console.log('resized', size);
            });
          });
        })
        .catch(error => {
          console.log('error', error);
        });
    },
    beforeDestroy() {
      this.updateProgress();
      this.$emit('stopTracking');
    },
    destroyed() {
      delete global.ePub;
    },
    methods: {
      handleTocToggle() {
        this.sideBarOpen === SIDE_BARS.TOC
          ? (this.sideBarOpen = null)
          : (this.sideBarOpen = SIDE_BARS.TOC);
      },
      handleSearchToggle() {
        this.sideBarOpen === SIDE_BARS.SEARCH
          ? (this.sideBarOpen = null)
          : (this.sideBarOpen = SIDE_BARS.SEARCH);
      },
      handleSettingToggle() {
        this.sideBarOpen === SIDE_BARS.SETTINGS
          ? (this.sideBarOpen = null)
          : (this.sideBarOpen = SIDE_BARS.SETTINGS);
      },
      handleTocNavigation(item) {
        this.rendition.display(item.href);
      },
      goToNextPage() {
        console.log(this.getNavItemByHref());
        this.rendition.next();
      },
      goToPreviousPage() {
        this.rendition.prev();
      },
      increaseFontSize() {
        this.fontSize = Math.min(this.fontSize + FONT_SIZE_INC, MAX_FONT_SIZE);
      },
      decreaseFontSize() {
        this.fontSize = Math.max(this.fontSize - FONT_SIZE_INC, MIN_FONT_SIZE);
      },
      resetFontSize() {
        this.fontSize = DEFAULT_FONT_SIZE;
      },
      handleNewSearchQuery(searchQuery) {
        this.searchQuery = searchQuery;
        this.clearMarks().then(this.createMarks(searchQuery));
      },
      handleNavigateToSearchResult(searchResult) {
        this.clearMarks()
          .then(() => this.rendition.display(searchResult.cfi))
          .then(() => this.createMarks(this.searchQuery));
      },
      clearMarks() {
        return new Promise(resolve => {
          if (this.markInstance) {
            this.markInstance.unmark({
              done: () => {
                this.markInstance = null;
                resolve();
              },
            });
          } else {
            resolve();
          }
        });
      },
      createMarks(searchQuery) {
        return new Promise(resolve => {
          this.markInstance = new Mark(
            this.$refs.epubjsContainer.querySelector('iframe').contentDocument.querySelector('body')
          );
          this.markInstance.mark(searchQuery, {
            done: () => resolve(),
          });
        });
      },
      updateProgress() {
        this.$emit('updateProgress', this.sessionTimeSpent / this.targetTime);
      },
      setFontSize() {},
      setTheme(theme) {
        this.theme = theme;
      },
      setTextAlignment(textAlignment) {
        this.textAlignment = textAlignment;
      },
      getNavItemByHref() {
        return (
          (function flatten(arr) {
            return [].concat(...arr.map(v => [v, ...flatten(v.subitems)]));
          })(this.toc).filter(
            item =>
              this.book.canonical(item.href) ==
              this.book.canonical(this.rendition.currentLocation().start.href)
          )[0] || null
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .epub-renderer {
    position: relative;
    // min-height: 400px;
    height: 500px;
  }

  .epubjs-container {
    position: absolute;
    top: 36px;
    right: 0;
    bottom: 36px;
    left: 0;
    max-width: 1000px;
    height: 464px;
    margin: auto;
    background-color: #ffffff;
    transition: left 0.2s ease;
  }

  .epubjs-container-push-right {
    left: 250px;
  }

  .epubjs-container-push-left {
    right: 250px;
  }

  .top-bar {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
  }

  .side-bar {
    position: absolute;
    top: 36px;
    bottom: 36px;
  }

  .side-bar-left {
    left: 0;
  }

  .side-bar-right {
    right: 0;
  }

  .search-submit-button {
    text-align: center;
  }

  .search-results-list,
  .toc-list {
    padding: 0 0 0 24px;
    margin: 0;
    font-size: smaller;
  }

  .toc-list-item {
    padding: 0 8px 8px 0;
  }

  .toc-header {
    padding: 8px;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chapter-name {
    margin: 0;
    overflow: hidden;
    line-height: 36px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .previous-button,
  .next-button {
    position: absolute;
    top: 36px;
    z-index: 4;
    width: 64px;
    height: 424px;
    padding: 8px;
    border-radius: unset;
    &.ui-icon-button {
      &:hover {
        background-color: unset;
      }
    }
  }

  .previous-button {
    left: 0;
    text-align: left;
  }

  .next-button {
    right: 0;
    text-align: right;
  }

  .slider-container {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 36px;
    padding: 8px;
  }

  .slider {
    width: 100%;
  }

  .d-t {
    display: table;
  }

  .d-t-r {
    display: table-row;
  }

  .d-t-c {
    display: table-cell;
  }

  .max-width {
    width: 100%;
  }

</style>
