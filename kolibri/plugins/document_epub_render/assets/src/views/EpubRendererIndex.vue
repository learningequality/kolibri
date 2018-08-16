<template>

  <core-fullscreen
    ref="epubRenderer"
    class="epub-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <div class="loading-screen">
      <KCircularLoader
        v-show="!loaded"
        type="indeterminate"
        :delay="false"
      />
      <p>{{ $tr('loadingBook') }}</p>
    </div>

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


      <div
        ref="epubjsContainer"
        class="epubjs-container"
        :class="epubjsContainerClass"
        :style="{ 'backgroundColor': backgroundColor }"
      >
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
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';

  import UiIconButton from 'keen-ui/src/UiIconButton';

  import TopBar from './TopBar';
  import TableOfContentsSideBar from './TableOfContentsSideBar';
  import SettingsSideBar from './SettingsSideBar';
  import SearchSideBar from './SearchSideBar';
  import BottomBar from './BottomBar';

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
      loadingBook: 'Loading book',
    },
    components: {
      UiIconButton,
      CoreFullscreen,
      TopBar,
      TableOfContentsSideBar,
      SettingsSideBar,
      SearchSideBar,
      KCircularLoader,
      BottomBar,
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
      console.log('mounted');
      this.book.ready
        .then(() => {
          this.rendition = this.book.renderTo(this.$refs.epubjsContainer, {
            manager,
            view: iFrameView,
            width: 500,
            height: 400,
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
      handleSliderChanged(newSliderValue) {
        console.log(this.locations[this.locations.length - 1]);
        const indexOfLocationToJumpTo = Math.floor(
          (this.locations.length - 1) * (newSliderValue / 100)
        );
        const locationToJumpTo = this.locations[indexOfLocationToJumpTo];
        this.rendition.display(locationToJumpTo);
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
        this.rendition.display(item.href);
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
        const flatToc = this.flattenToc(this.toc);
        let currentSection;
        // console.log({ currentLocationStart });
        if (currentLocationStart) {
          const currentLocationHref = this.book.canonical(currentLocationStart.href);
          // Exact match
          currentSection = flatToc.filter(
            item => this.book.canonical(item.href) === currentLocationHref
          )[0];
          // If no exact match try to find best match
          if (!currentSection) {
            console.log('guessing', currentLocationHref);
            currentSection = flatToc.filter(item => {
              console.log(this.book.canonical(item.href));
              return this.book.canonical(item.href).split('#')[0] === currentLocationHref;
            })[0];
          }
        }
        return currentSection;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

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
    top: 38px;
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

  .bottom-bar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .loading-screen {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

</style>
