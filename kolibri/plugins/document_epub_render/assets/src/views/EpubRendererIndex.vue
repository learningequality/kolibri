<template>

  <core-fullscreen
    ref="epubRenderer"
    class="epub-renderer"
    :style="epubRendererStyle"
    @changeFullscreen="isInFullscreen = $event"
  >

    <LoadingScreen v-show="!loaded" />

    <div v-show="loaded">

      <TopBar
        ref="topBar"
        class="top-bar"
        :isInFullscreen="isInFullscreen"
        @tableOfContentsClicked="handleTocToggle"
        @settingsClicked="handleSettingToggle"
        @searchClicked="handleSearchToggle"
        @fullscreenClicked="$refs.epubRenderer.toggleFullscreen()"
      />

      <FocusLock
        :disabled="!tocSideBarIsOpen"
        :returnFocus="false"
      >
        <TocButton
          v-if="tocSideBarIsOpen"
          class="toc-button"
          @click="handleTocToggle"
        />

        <TableOfContentsSideBar
          v-show="tocSideBarIsOpen"
          ref="tocSideBar"
          :toc="toc"
          :currentSection="currentSection"
          class="side-bar side-bar-left"
          @tocNavigation="handleTocNavigation"
        />
      </FocusLock>

      <FocusLock
        :disabled="!settingsSideBarIsOpen"
        :returnFocus="false"
      >
        <SettingsButton
          v-if="settingsSideBarIsOpen"
          class="settings-button"
          @click="handleSettingToggle"
        />

        <SettingsSideBar
          v-show="settingsSideBarIsOpen"
          ref="settingsSideBar"
          class="side-bar side-bar-right"
          :theme="theme"
          :textAlignment="textAlignment"
          @decreaseFontSize="decreaseFontSize"
          @increaseFontSize="increaseFontSize"
          @setTheme="setTheme"
          @setTextAlignment="setTextAlignment"
        />
      </FocusLock>

      <FocusLock
        :disabled="!searchSideBarIsOpen"
        :returnFocus="false"
      >
        <SearchButton
          v-if="searchSideBarIsOpen"
          class="search-button"
          @click="handleSearchToggle"
        />

        <SearchSideBar
          v-show="searchSideBarIsOpen"
          ref="searchSideBar"
          class="side-bar side-bar-right"
          :book="book"
          @newSearchQuery="handleNewSearchQuery"
          @navigateToSearchResult="handleNavigateToSearchResult"
        />
      </FocusLock>

      <div class="navigation-and-epubjs">
        <div
          class="column"
          :style="navigationButtonContainerStyle"
        >
          <PreviousButton
            @goToPreviousPage="goToPreviousPage"
            :color="navigationButtonColor"
            :style="navigationButtonsStyle"
          />
        </div>
        <div
          ref="epubjsContainer"
          class="column"
          :style="epubjsContainerStyle"
        >
        </div>
        <div
          class="column"
          :style="navigationButtonContainerStyle"
        >
          <NextButton
            :color="navigationButtonColor"
            :style="navigationButtonsStyle"
            @goToNextPage="goToNextPage"
          />
        </div>
      </div>

      <BottomBar
        class="bottom-bar"
        :heading="bottomBarHeading"
        :sliderValue="sliderValue"
        :sliderStep="sliderStep"
        @sliderChanged="handleSliderChanged"
      />
    </div>
  </core-fullscreen>

</template>


<script>

  import Epub from 'epubjs/src/epub';
  import defaultManager from 'epubjs/src/managers/default';
  import iFrameView from 'epubjs/src/managers/views/iframe';

  import Mark from 'mark.js';
  import debounce from 'lodash/debounce';

  import FocusLock from 'vue-focus-lock';

  import { mapGetters } from 'vuex';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';

  import LoadingScreen from './LoadingScreen';
  import TopBar from './TopBar';
  import TableOfContentsSideBar from './TableOfContentsSideBar.vue';
  import SettingsSideBar from './SettingsSideBar';
  import SearchSideBar from './SearchSideBar';
  import BottomBar from './BottomBar';
  import PreviousButton from './PreviousButton';
  import NextButton from './NextButton';
  import TocButton from './TocButton';
  import SettingsButton from './SettingsButton';
  import SearchButton from './SearchButton';

  import { TEXT_ALIGNMENTS, THEMES } from './EpubConstants';

  const FONT_SIZE_INC = 2;
  const MIN_FONT_SIZE = 8;
  const DEFAULT_FONT_SIZE = 16;
  const MAX_FONT_SIZE = 24;

  const TOP_BAR_HEIGHT = 36;
  const BOTTOM_BAR_HEIGHT = 54;

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
      loadingBook: 'Loading book',
    },
    components: {
      CoreFullscreen,
      TopBar,
      TableOfContentsSideBar,
      SettingsSideBar,
      SearchSideBar,
      LoadingScreen,
      BottomBar,
      PreviousButton,
      NextButton,
      FocusLock,
      TocButton,
      SettingsButton,
      SearchButton,
    },
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin],
    data: () => ({
      epubURL: 'http://localhost:8000/content/storage/epub12.epub',
      book: null,
      rendition: null,
      toc: [],
      locations: [],
      loaded: false,
      sideBarOpen: null,
      theme: THEMES.WHITE,
      textAlignment: TEXT_ALIGNMENTS.LEFT,
      fontSize: DEFAULT_FONT_SIZE,
      isInFullscreen: false,
      markInstance: null,
      currentSection: null,
      searchQuery: null,
      sliderValue: 0,

      currentLocationCfi: null,

      // TODO
      progress: 0,
      totalPages: null,
    }),
    computed: {
      backgroundColor() {
        return this.theme.backgroundColor;
      },
      textColor() {
        return this.theme.textColor;
      },
      themeStyle() {
        return {
          body: {
            'background-color': this.backgroundColor,
            color: this.textColor,
            'font-size': `${this.fontSize}px`,
          },
          p: {
            'background-color': this.backgroundColor,
            color: this.textColor,
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
      epubRendererStyle() {
        const ratio = this.windowIsSmall ? 11 / 8.5 : 8.5 / 11;
        return { height: `${this.elementWidth * ratio}px` };
      },
      navigationButtonColor() {
        return [THEMES.BLACK, THEMES.GREY].includes(this.theme) ? 'white' : 'black';
      },
      navigationButtonsStyle() {
        return {
          backgroundColor: this.backgroundColor,
        };
      },
      navigationButtonWidth() {
        return this.windowIsSmall ? 36 : 52;
      },
      navigationButtonContainerStyle() {
        return {
          width: `${this.navigationButtonWidth}px`,
        };
      },
      epubjsContainerStyle() {
        return {
          backgroundColor: this.backgroundColor,
          width: `${this.elementWidth - this.navigationButtonWidth * 2}px`,
        };
      },
      bottomBarHeading() {
        if (this.currentSection) {
          return this.currentSection.label.trim();
        }
        return '';
      },
      sliderStep() {
        if (this.locations.length > 0) {
          return Math.min(Math.max(100 / this.locations.length, 0.1), 100);
        }
        return 1;
      },

      // TODO
      ...mapGetters(['sessionTimeSpent']),
      targetTime() {
        return this.totalPages * 30;
      },
    },
    watch: {
      sideBarOpen(newSideBar, oldSideBar) {
        this.$nextTick().then(() => {
          if (oldSideBar === SIDE_BARS.SEARCH) {
            this.clearMarks();
          }
          if (!newSideBar) {
            switch (oldSideBar) {
              case SIDE_BARS.TOC:
                this.$refs.topBar.focusOnTocButton();
                break;
              case SIDE_BARS.SETTINGS:
                this.$refs.topBar.focusOnSettingsButton();
                break;
              case SIDE_BARS.SEARCH:
                this.$refs.topBar.focusOnSearchButton();
                break;
              default:
                break;
            }
          }
          if (newSideBar === SIDE_BARS.SEARCH) {
            this.$refs.searchSideBar.focusOnInput();
            if (this.searchQuery) {
              this.clearMarks().then(this.createMarks(this.searchQuery));
            }
          }
        });
      },
      themeStyle(newTheme) {
        if (this.rendition) {
          const themeName = JSON.stringify(newTheme);
          this.rendition.themes.register(themeName, newTheme);
          this.rendition.themes.select(themeName);
        }
      },
      elementHeight(newHeight) {
        if (this.loaded) {
          const width = this.calculateRenditionWidth(this.elementWidth);
          const height = this.calculateRenditionHeight(newHeight);
          this.debounceResizeRendition(width, height);
        }
      },
      elementWidth(newWidth) {
        if (this.loaded) {
          const width = this.calculateRenditionWidth(newWidth);
          const height = this.calculateRenditionHeight(this.elementHeight);
          this.debounceResizeRendition(width, height);
        }
      },
    },
    beforeMount() {
      global.ePub = Epub;
      this.book = new Epub(this.epubURL);
    },
    mounted() {
      this.book.ready.then(() => {
        const width = this.calculateRenditionWidth(this.elementWidth);
        const height = this.calculateRenditionHeight(this.elementHeight);
        this.rendition = this.book.renderTo(this.$refs.epubjsContainer, {
          defaultManager,
          view: iFrameView,
          width,
          height,
          spread: 'auto',
          minSpreadWidth: 600,
        });
        this.rendition.display().then(() => {
          if (this.book.navigation) {
            this.toc = this.book.navigation.toc;
          }

          this.book.locations.generate(1000).then(locations => {
            this.locations = locations;
            // force resize on load
            // Not sure why I need to wait for next tick
            this.$nextTick().then(() => {
              this.resizeRendition(width, height);
            });
            this.loaded = true;
            this.rendition.on('relocated', location => this.relocatedHandler(location));
            // this.rendition.on('resized', newSize => );
          });
        });
      });
    },
    beforeDestroy() {
      // TODO
      this.updateProgress();
      this.$emit('stopTracking');
    },
    destroyed() {
      delete global.ePub;
    },
    methods: {
      calculateRenditionWidth(availableWidth) {
        return availableWidth - this.navigationButtonWidth * 2;
      },
      calculateRenditionHeight(availableHeight) {
        return availableHeight - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT;
      },
      goToNextPage() {
        this.rendition.next();
      },
      goToPreviousPage() {
        this.rendition.prev();
      },
      jumpToLocation(locationToJumpTo) {
        return this.rendition.display(locationToJumpTo);
      },
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
        this.jumpToLocation(item.href);
        this.sideBarOpen = null;
      },
      increaseFontSize() {
        this.fontSize = Math.min(this.fontSize + FONT_SIZE_INC, MAX_FONT_SIZE);
      },
      decreaseFontSize() {
        this.fontSize = Math.max(this.fontSize - FONT_SIZE_INC, MIN_FONT_SIZE);
      },
      setTheme(theme) {
        this.theme = theme;
      },
      setTextAlignment(textAlignment) {
        this.textAlignment = textAlignment;
      },
      handleNewSearchQuery(searchQuery) {
        this.searchQuery = searchQuery;
        this.clearMarks().then(this.createMarks(searchQuery));
      },
      handleNavigateToSearchResult(searchResult) {
        this.clearMarks()
          .then(() => this.jumpToLocation(searchResult.cfi))
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
            separateWordSearch: false,
            done: () => resolve(),
          });
        });
      },
      flattenToc(toc) {
        return [].concat(...toc.map(section => [section, ...this.flattenToc(section.subitems)]));
      },
      getCurrentSection(currentLocationStart) {
        let currentSection;
        if (currentLocationStart) {
          const flatToc = this.flattenToc(this.toc);
          const currentLocationHref = this.book.canonical(currentLocationStart.href);
          currentSection = flatToc.find(
            item => this.book.canonical(item.href) === currentLocationHref
          );
        }
        return currentSection;
      },
      updateCurrentSection(currentLocationStart) {
        this.currentSection = this.getCurrentSection(currentLocationStart);
      },
      relocatedHandler(location) {
        this.sliderValue = location.start.percentage * 100;
        this.updateCurrentSection(location.start);
      },

      handleSliderChanged(newSliderValue) {
        const indexOfLocationToJumpTo = Math.floor(
          (this.locations.length - 1) * (newSliderValue / 100)
        );
        const locationToJumpTo = this.locations[indexOfLocationToJumpTo];
        this.jumpToLocation(locationToJumpTo);
      },
      debounceResizeRendition: debounce(function(width, height) {
        this.resizeRendition(width, height);
      }, 250),
      resizeRendition(width, height) {
        if (width > 0 && height > 0) {
          let cfiToJumpTo;
          const currentLocation = this.rendition.currentLocation();
          if (currentLocation.start && currentLocation.start.cfi) {
            cfiToJumpTo = currentLocation.start.cfi;
          } else if (this.currentLocationCfi) {
            cfiToJumpTo = this.currentLocationCfi;
          } else {
            cfiToJumpTo = this.locations[0];
          }
          this.currentLocationCfi = cfiToJumpTo;
          this.rendition.resize(width, height);

          if (!this.$refs.epubjsContainer.querySelector('iframe')) {
            // Re-render since resize currently breaks
            this.jumpToLocation(this.currentLocationCfi);
          }
        }
      },
      // TODO
      updateProgress() {
        this.$emit('updateProgress', this.sessionTimeSpent / this.targetTime);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './EpubStyles';

  .epub-renderer {
    position: relative;
    height: 500px;
    // position: fixed;
    // top: 0;
    // right: 0;
    // bottom: 0;
    // left: 0;
    // z-index: 1000;
    font-size: smaller;
    background-color: $core-bg-light;
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
    bottom: 54px;
  }

  .side-bar-left {
    left: 0;
  }

  .side-bar-right {
    right: 0;
  }

  .toc-button,
  .settings-button,
  .search-button {
    position: absolute;
    top: 0;
    z-index: 6;
  }
  .settings-button {
    right: 72px;
  }

  .search-button {
    right: 36px;
  }

  .bottom-bar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .d-t {
    @include d-t;
  }

  .d-t-r {
    @include d-t-r;
  }

  .d-t-c {
    @include d-t-c;
  }

  .navigation-and-epubjs {
    position: absolute;
    top: 36px;
    right: 0;
    bottom: 54px;
    left: 0;
  }

  .column {
    display: inline-block;
    height: 100%;
    overflow: hidden;
    text-align: center;
    vertical-align: top;
  }

</style>
