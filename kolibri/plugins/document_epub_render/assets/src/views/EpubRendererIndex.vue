<template>

  <core-fullscreen
    ref="epubRenderer"
    class="epub-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >

    <LoadingScreen v-show="!loaded" />

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

      <TableOfContentsSideBar
        v-show="tocSideBarIsOpen"
        ref="tocSideBar"
        :toc="toc"
        :currentSection="currentSection"
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

      <div class="navigation-and-epubjs">
        <div class="navigation-button-container d-ib">
          <PreviousButton
            :style="navigationButtonsStyle"
            @goToPreviousPage="goToPreviousPage"
          />
        </div>
        <div
          class="d-ib"
          :style="{ width: `${elementWidth - 64 - 64}px`}"
        >middle</div>
        <div
          v-show="4 === 0"
          ref="epubjsContainer"
          class="epubjs-container d-ib"
          :class="epubjsContainerClass"
          :style="{ 'backgroundColor': backgroundColor }"
        >
        </div>
        <div class="navigation-button-container d-ib">
          <NextButton
            v-show="4 === 0"
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

  import { mapGetters } from 'vuex';

  import Epub from 'epubjs/src/epub';
  import manager from 'epubjs/src/managers/default';
  import iFrameView from 'epubjs/src/managers/views/iframe';

  import Mark from 'mark.js';

  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';

  import LoadingScreen from './LoadingScreen';
  import TopBar from './TopBar';
  import TableOfContentsSideBar from './TableOfContentsSideBar';
  import SettingsSideBar from './SettingsSideBar';
  import SearchSideBar from './SearchSideBar';
  import BottomBar from './BottomBar';
  import PreviousButton from './PreviousButton';
  import NextButton from './NextButton';

  import { TEXT_ALIGNMENTS, THEMES } from './EpubConstants';

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
    },
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin],
    data: () => ({
      epubURL: 'http://localhost:8000/content/storage/epub3.epub',

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

      progress: 0,
      totalPages: null,
    }),
    computed: {
      ...mapGetters(['sessionTimeSpent']),
      backgroundColor() {
        return this.theme.backgroundColor;
      },
      color() {
        return this.theme.textColor;
      },
      navigationButtonsStyle() {
        return {
          fill: [THEMES.BLACK, THEMES.GREY].includes(this.theme) ? 'white' : 'black',
        };
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
      navigationAndEpubjs() {
        return {
          height: `${this.elementHeight - 36 - 54}px`,
        };
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
      sideBarOpen(newSideBar, oldSideBar) {
        if (oldSideBar === SIDE_BARS.SEARCH) {
          this.clearMarks();
        }

        if (newSideBar === SIDE_BARS.SEARCH) {
          this.$nextTick().then(() => this.$refs.searchSideBar.focusOnInput());
          if (this.searchQuery) {
            this.clearMarks().then(this.createMarks(this.searchQuery));
          }
        } else if (newSideBar === SIDE_BARS.TOC) {
          this.$nextTick().then(() => this.$refs.tocSideBar.focusOnCurrentSection());
        }
      },
      elementHeight(newHeight) {
        if (this.loaded) {
          this.resizeRendition(this.elementWidth, newHeight);
          // resize not working
        }
      },
      elementWidth(newWidth) {
        if (this.loaded) {
          // resize not working
          this.resizeRendition(newWidth, this.elementHeight);
        }
      },
      progress(newProgress) {
        const indexToJumpTo = Math.floor((this.locations.length - 1) * (newProgress / 100));
        const locationToJumpTo = this.locations[indexToJumpTo];
        this.jumpToLocation(locationToJumpTo);
      },
    },
    beforeMount() {
      global.ePub = Epub;
      this.book = new Epub(this.epubURL);
    },
    mounted() {
      console.log('mounted');
      this.book.ready
        .then(() => {
          this.rendition = this.book.renderTo(this.$refs.epubjsContainer, {
            manager,
            view: iFrameView,
            width: this.elementWidth - 64 - 64,
            height: this.elementHeight - 36 - 54,
          });
          // width\ height
          console.log('book is ready');
          this.rendition.display().then(() => {
            console.log('book is displayed');
            // Loaded
            if (this.book.navigation) {
              console.log(this.book.manifest, this.book.metadata);
              this.toc = this.book.navigation.toc;
            }
            console.log('gernating location');
            this.book.locations.generate(1000).then(locations => {
              console.log('locations');
              this.locations = locations;
              this.loaded = true;
            });

            this.rendition.on('resized', size => {
              // console.log('resized', size);
            });

            this.rendition.on('relocated', location => this.relocatedHandler(location));
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
      resizeRendition(width, height) {
        if (width > 0 && height > 0) {
          this.rendition.resize(width, height);
        }
      },
      handleSliderChanged(newSliderValue) {
        console.log(this.locations[this.locations.length - 1]);
        const indexOfLocationToJumpTo = Math.floor(
          (this.locations.length - 1) * (newSliderValue / 100)
        );
        const locationToJumpTo = this.locations[indexOfLocationToJumpTo];
        this.jumpToLocation(locationToJumpTo);
      },
      jumpToLocation(locationToJumpTo) {
        return this.rendition.display(locationToJumpTo);
      },
      relocatedHandler(location) {
        this.sliderValue = location.start.percentage * 100;
        this.updateCurrentSection(location.start);
        console.log(location);
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
      goToNextPage() {
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
      flattenToc(toc) {
        return [].concat(...toc.map(section => [section, ...this.flattenToc(section.subitems)]));
      },

      updateCurrentSection(currentLocationStart) {
        this.currentSection = this.getCurrentSection(currentLocationStart);
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
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './EpubStyles';

  .epub-renderer {
    // position: relative;
    // // min-height: 400px;
    // height: 500px;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1000;
    background-color: $core-bg-light;
  }

  .epubjs-container {
    max-width: 1000px;
    background-color: #ffffff;
  }

  .epubjs-container-push-right {
    // left: 250px;
  }

  .epubjs-container-push-left {
    // right: 250px;
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

  .navigation-button-container {
    width: 64px;
  }

  .navigation-and-epubjs {
    position: absolute;
    top: 36px;
    right: 0;
    bottom: 54px;
    left: 0;
  }

  .d-ib {
    display: inline-block;
    text-align: center;
  }

  .p-rel {
    position: relative;
    height: 100%;
  }

</style>
