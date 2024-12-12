<template>

  <CoreFullscreen
    ref="epubRenderer"
    class="epub-renderer"
    :class="{ small: windowIsSmall, scrolled: scrolled }"
    :style="epubRendererStyle"
    @changeFullscreen="isInFullscreen = $event"
  >
    <LoadingError
      v-if="errorLoading"
      :loaded="loaded"
    />

    <LoadingScreen v-else-if="!loaded" />

    <div
      class="epub-renderer-content"
      :style="{ 'border-color': $themeTokens.fineLine }"
      :dir="contentDirection"
      @mousedown.stop="handleMouseDown"
      @keyup.esc="closeSideBar"
    >
      <TopBar
        ref="topBar"
        class="top-bar-component"
        :isInFullscreen="isInFullscreen"
        :hideSearchButton="searchSideBarIsOpen"
        @tableOfContentsButtonClicked="handleTocToggle"
        @settingsButtonClicked="handleSettingToggle"
        @searchButtonClicked="handleSearchToggle"
        @fullscreenButtonClicked="$refs.epubRenderer.toggleFullscreen()"
      />

      <FocusLock
        :disabled="!tocSideBarIsOpen"
        :returnFocus="true"
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
          :decreaseFontSizeDisabled="decreaseFontSizeDisabled"
          :increaseFontSizeDisabled="increaseFontSizeDisabled"
          @decreaseFontSize="handleChangeFontSize(-1)"
          @increaseFontSize="handleChangeFontSize(+1)"
          @setTheme="setTheme"
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

      <div
        class="navigation-and-epubjs"
        :style="{ backgroundColor }"
      >
        <div class="column epubjs-navigation">
          <NextButton
            v-if="contentIsRtl"
            v-show="!isAtEnd"
            :disabled="!locationsAreReady"
            :color="navigationButtonColor"
            :isRtl="contentIsRtl"
            :style="{ backgroundColor }"
            @goToNextPage="goToNextPage"
          />
          <PreviousButton
            v-else
            v-show="!isAtStart"
            :disabled="!locationsAreReady"
            :color="navigationButtonColor"
            :isRtl="contentIsRtl"
            :style="{ backgroundColor }"
            @goToPreviousPage="goToPreviousPage"
          />
        </div>
        <div
          ref="epubjsContainer"
          class="column epubjs-parent"
          :style="{ backgroundColor }"
        ></div>
        <div class="column epubjs-navigation">
          <PreviousButton
            v-if="contentIsRtl"
            v-show="!isAtStart"
            :disabled="!locationsAreReady"
            :color="navigationButtonColor"
            :isRtl="contentIsRtl"
            :style="{ backgroundColor }"
            @goToPreviousPage="goToPreviousPage"
          />
          <NextButton
            v-else
            v-show="!isAtEnd"
            :disabled="!locationsAreReady"
            :color="navigationButtonColor"
            :isRtl="contentIsRtl"
            :style="{ backgroundColor }"
            @goToNextPage="goToNextPage"
          />
        </div>
      </div>

      <BottomBar
        class="bottom-bar"
        :locationsAreReady="locationsAreReady"
        :heading="bottomBarHeading"
        :sliderValue="sliderValue"
        :sliderStep="sliderStep"
        @sliderChanged="handleSliderChanged"
      />
    </div>
  </CoreFullscreen>

</template>


<script>

  import Epub from 'epubjs/src/epub';
  import { EVENTS } from 'epubjs/src/utils/constants';
  import Mark from 'mark.js';
  import isEqual from 'lodash/isEqual';
  import get from 'lodash/get';
  import clamp from 'lodash/clamp';
  import Lockr from 'lockr';
  import FocusLock from 'vue-focus-lock';
  import CoreFullscreen from 'kolibri-common/components/CoreFullscreen';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import iFrameView from './SandboxIFrameView';
  import LoadingScreen from './LoadingScreen';
  import LoadingError from './LoadingError';
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

  import { THEMES, darkThemeNames } from './EpubConstants';

  const FONT_SIZE_MIN = 8;
  const FONT_SIZE_MAX = 32;
  const FONT_SIZE_STEP = 4;

  const SIDE_BARS = {
    TOC: 'TOC',
    SEARCH: 'SEARCH',
    SETTINGS: 'SETTINGS',
  };

  const LOCATIONS_INTERVAL = 1000;

  const EPUB_RENDERER_SETTINGS_KEY = 'kolibriEpubRendererSettings';

  export default {
    name: 'EpubRendererIndex',
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
      LoadingError,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    data() {
      return {
        book: null,
        rendition: null,
        toc: [],
        locations: [],
        loaded: false,
        errorLoading: false,
        sideBarOpen: null,
        theme: THEMES.WHITE,
        fontSize: null,
        isInFullscreen: false,
        markInstance: null,
        currentSection: null,
        searchQuery: null,
        sliderValue: 0,
        scrolled: false,
        currentLocation: null,
        visitedPages: {},
        updateContentStateInterval: null,
      };
    },
    computed: {
      isAtStart() {
        return get(this.rendition, 'location.atStart', false);
      },
      isAtEnd() {
        return get(this.rendition, 'location.atEnd', false);
      },
      savedLocation() {
        if (this.extraFields && this.extraFields.contentState) {
          return this.extraFields.contentState.savedLocation;
        }
        return null;
      },
      savedVisitedPages: {
        get() {
          if (this.extraFields && this.extraFields.contentState) {
            return this.extraFields.contentState.savedVisitedPages || {};
          }
          return {};
        },
        set(value) {
          this.visitedPages = value;
        },
      },
      epubURL() {
        return new URL(this.defaultFile.storage_url, window.location).href;
      },
      backgroundColor() {
        return this.theme.backgroundColor;
      },
      textColor() {
        return this.theme.textColor;
      },
      themeStyle() {
        const colorStyle = {
          'background-color': `${this.backgroundColor}!important`,
          color: `${this.textColor}!important`,
        };
        const alignmentStyle = {
          'text-align': `${this.isRtl ? 'right' : 'left'}`,
        };
        const fontSizeStyle = this.fontSize ? { 'font-size': `${this.fontSize}!important` } : {};

        const lineHeightStyle = {
          'line-height': `1.4em!important`,
        };

        // In scrolled mode, display flex helps body size to it's content
        // In paged column mode, clear margins on <html> to avoid issues with rendering
        const htmlStyle = this.scrolled ? { display: 'flex' } : { margin: '0!important' };

        // Width style overrides the pixel width added by epub.js, and in conjunction with flex
        // above, helps SandboxIFrameView size containers according to true content width.
        // Padding override kills an arbitrary `padding:0 (width / 12)px` set by epub.js
        const bodyScrolledStyle = this.scrolled
          ? { width: 'auto!important', padding: '20px!important' }
          : {};

        return {
          html: { ...colorStyle, ...alignmentStyle, ...fontSizeStyle, ...htmlStyle },
          body: { ...colorStyle, ...alignmentStyle, ...fontSizeStyle, ...bodyScrolledStyle },
          p: { ...colorStyle, ...alignmentStyle, ...lineHeightStyle },
          h1: { ...colorStyle },
          h2: { ...colorStyle },
          h3: { ...colorStyle },
          h4: { ...colorStyle },
          h5: { ...colorStyle },
          'p:first-of-type::first-letter': { ...colorStyle },
          // help media not overflow their columns
          video: { 'max-width': '100%' },
          img: { 'max-width': '100%' },
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
        return {
          backgroundColor: this.$themeTokens.surface,
        };
      },
      navigationButtonColor() {
        return darkThemeNames.some(themeName => isEqual(this.theme.name, themeName))
          ? 'white'
          : 'black';
      },
      bottomBarHeading() {
        if (this.currentSection) {
          return this.currentSection.label.trim();
        }
        return '';
      },
      sliderStep() {
        if (this.locations.length > 0) {
          return Math.floor(Math.min(Math.max(100 / this.locations.length, 0.1), 100));
        }
        return 1;
      },
      decreaseFontSizeDisabled() {
        return this.fontSize === `${FONT_SIZE_MIN}px`;
      },
      increaseFontSizeDisabled() {
        return this.fontSize === `${FONT_SIZE_MAX}px`;
      },
      /**
       * @public
       */
      defaultDuration() {
        const WORDS_PER_MINUTE = 300;
        const CHARS_PER_WORD = 10;
        const numberOfWords = (this.locations.length * LOCATIONS_INTERVAL) / CHARS_PER_WORD;
        const seconds = (numberOfWords * 60) / WORDS_PER_MINUTE;
        return seconds;
      },
      locationsAreReady() {
        return this.locations && this.locations.length > 0;
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
    },
    created() {
      // Try to load the appropriate directional CSS for the particular content
      this.cssPromise = this.$options.contentModule.loadDirectionalCSS(this.contentDirection);
      this.visitedPages = this.savedVisitedPages || {};
    },
    beforeMount() {
      global.ePub = Epub;
      this.book = new Epub(this.epubURL);
      this.book.on(EVENTS.BOOK.OPEN_FAILED, err => {
        this.errorLoading = true;
        this.reportLoadingError(err);
      });

      const { theme = this.theme, fontSize = this.fontSize } =
        Lockr.get(EPUB_RENDERER_SETTINGS_KEY) || {};
      this.theme = theme;
      this.fontSize = fontSize;
    },
    mounted() {
      Promise.all([this.cssPromise, this.book.ready]).then(() => {
        if (this.book.navigation) {
          this.toc = this.book.navigation.toc;
        }

        this.rendition = this.book.renderTo(this.$refs.epubjsContainer, {
          view: iFrameView,
          resizeOnOrientationChange: false,
          spread: 'auto',
          minSpreadWidth: 600,
        });

        this.rendition
          .display(this.savedLocation || undefined)
          .then(() => {
            const hasTables = this.rendition.getContents().reduce((hasTable, contents) => {
              return hasTable || contents.document.getElementsByTagName('table').length > 0;
            }, false);

            // Tables have issues rendering, so switch from paginated flow to scrolled
            if (hasTables) {
              this.scrolled = true;
              this.rendition.flow('scrolled');
              this.rendition.clear();
              // Re-renders and targets this.savedLocation (if set)
              return this.rendition.display(this.savedLocation || undefined);
            }

            // For paginated, update settings
            const bounds = this.$refs.epubjsContainer.getBoundingClientRect();
            Object.assign(this.rendition.manager.stage.settings, {
              width: bounds.width,
              height: bounds.height,
            });

            const resize = new Promise((resolve, reject) => {
              this.rendition.once(EVENTS.RENDITION.DISPLAYED, resolve);
              this.rendition.once(EVENTS.RENDITION.DISPLAY_ERROR, reject);
            });

            return this.rendition.q
              .enqueue(() => this.rendition.resize())
              .then(() => resize)
              .then(
                () => {},
                () => {
                  // In IE 11, EVENTS.RENDITION.DISPLAY_ERROR occurs when calling .resize(),
                  // so we'll try to redisplay, and if that's successful remove `errorLoading`
                  return this.rendition.display(this.savedLocation || undefined);
                },
              )
              .then(() => {
                this.errorLoading = false;
              });
          })
          .then(
            () => {
              this.handleReadyRendition();
            },
            () => {
              this.errorLoading = true;
            },
          );

        this.rendition.on(EVENTS.RENDITION.DISPLAY_ERROR, err => {
          this.errorLoading = true;
          this.reportLoadingError(err);
        });
      });
    },
    beforeDestroy() {
      this.updateContentState();
      this.updateProgress();
      this.$emit('stopTracking');
      window.removeEventListener('mousedown', this.handleMouseDown, { passive: true });
      clearInterval(this.updateContentStateInterval);
    },
    destroyed() {
      delete global.ePub;
    },
    methods: {
      updateProgress() {
        if (this.locations.length > 0) {
          if (this.forceDurationBasedProgress) {
            // update progress using total time user has spent on the epub
            this.$emit('updateProgress', this.durationBasedProgress);
          } else {
            // update progress using number of pages seen out of available pages
            this.$emit(
              'updateProgress',
              Object.keys(this.visitedPages || {}).length / this.locations.length,
            );
          }
        }
      },
      storeVisitedPage(currentLocation) {
        if (currentLocation) {
          const visited = this.savedVisitedPages;
          visited[currentLocation] = true;
          this.savedVisitedPages = visited;
        }
      },
      handleReadyRendition() {
        this.updateRenditionTheme(this.themeStyle);

        this.rendition.on(EVENTS.RENDITION.RELOCATED, location => this.relocatedHandler(location));
        this.rendition.on('keyup', this.handleKeyUps);
        this.rendition.on('click', () => this.closeSideBar());

        window.addEventListener('mousedown', this.handleMouseDown, { passive: true });

        this.loaded = true;

        this.book.locations.generate(LOCATIONS_INTERVAL).then(locations => {
          this.locations = locations;
          this.$emit('startTracking');
          this.updateContentStateInterval = setInterval(this.updateProgress, 30000);

          // Update current location, .currentLocation() can return Promise or value
          Promise.resolve()
            .then(() => this.rendition.currentLocation())
            .then(currentLocation => {
              if (currentLocation && currentLocation.start) {
                this.relocatedHandler(currentLocation);
              }
            });
        });
      },
      updateRenditionTheme(newTheme) {
        const themeName = JSON.stringify(newTheme);
        this.rendition.themes.register(themeName, newTheme);
        this.rendition.themes.select(themeName);
      },
      getIFrameView() {
        return this.rendition
          .views()
          .displayed()
          .filter(view => view instanceof iFrameView)
          .shift();
      },
      handleKeyUps(event) {
        const focus = () => {
          const view = this.getIFrameView();
          if (view) {
            view.focus();
          }
        };

        switch (event.which) {
          case 37:
            this.goToPreviousPage().then(focus);
            break;
          case 39:
            this.goToNextPage().then(focus);
            break;
        }
      },
      handleMouseDown(event) {
        // This check is necessary because event listeners don't seem to be removed on beforeDestroy
        if (this.$refs.epubRenderer) {
          let closeSideBar = false;
          if (this.tocSideBarIsOpen) {
            closeSideBar = !this.$refs.tocSideBar.$el.contains(event.target);
          } else if (this.settingsSideBarIsOpen) {
            closeSideBar = !this.$refs.settingsSideBar.$el.contains(event.target);
          } else if (this.searchSideBarIsOpen) {
            closeSideBar = !this.$refs.searchSideBar.$el.contains(event.target);
          }
          if (closeSideBar) {
            this.closeSideBar();
          }
        }
      },
      closeSideBar() {
        this.sideBarOpen = null;
      },
      goToNextPage() {
        return this.rendition.next();
      },
      goToPreviousPage() {
        return this.rendition.prev();
      },
      jumpToLocation(locationToJumpTo) {
        return this.rendition.display(locationToJumpTo);
      },
      toggleMenu(sideBarName) {
        if (this.sideBarOpen === sideBarName) {
          this.closeSideBar();
        } else {
          this.sideBarOpen = sideBarName;
        }
      },
      handleTocToggle() {
        this.toggleMenu(SIDE_BARS.TOC);
      },
      handleSearchToggle() {
        this.toggleMenu(SIDE_BARS.SEARCH);
      },
      handleSettingToggle() {
        this.toggleMenu(SIDE_BARS.SETTINGS);
      },
      handleTocNavigation(item) {
        this.jumpToLocation(item.href)
          .then(() => {
            this.closeSideBar();
          })
          .catch(() => {
            this.jumpToLocation(`xhtml/${item.href}`).then(() => {
              this.closeSideBar();
            });
          });
      },
      getCurrentFontSize() {
        const view = this.getIFrameView();

        // Use epub Contents class which will get computed font-size
        return view ? view.getContents().css('font-size', null) : null;
      },
      handleChangeFontSize(difference) {
        const fontSizeNumericValue = parseFloat(this.getCurrentFontSize());
        const newFontSizeNumericValue = clamp(
          fontSizeNumericValue + difference * FONT_SIZE_STEP,
          FONT_SIZE_MIN,
          FONT_SIZE_MAX,
        );
        this.setFontSize(`${newFontSizeNumericValue}px`);
      },
      expandIFrameView() {
        const view = this.getIFrameView();

        if (view) {
          // TODO: Figure out how to get this trigger the iframe containers to resize
        }
      },
      setTheme(theme) {
        this.theme = theme;
        this.persistSettings({ theme });
        this.updateRenditionTheme(this.themeStyle);
      },
      setFontSize(fontSize) {
        this.fontSize = fontSize;
        this.persistSettings({ fontSize });
        this.updateRenditionTheme(this.themeStyle);

        if (this.scrolled) {
          this.expandIFrameView();
        }
      },
      persistSettings(settings) {
        const saved = Lockr.get(EPUB_RENDERER_SETTINGS_KEY);
        Lockr.set(EPUB_RENDERER_SETTINGS_KEY, {
          ...saved,
          ...settings,
        });
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
        const view = this.getIFrameView();
        if (!view) {
          return Promise.resolve();
        }

        return new Promise(resolve => {
          const root = view.getContents().root();
          this.markInstance = new Mark(root.getElementsByTagName('body').item(0));
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
            item => this.book.canonical(item.href) === currentLocationHref,
          );
        }
        return currentSection;
      },
      updateCurrentSection(currentLocationStart) {
        this.currentSection = this.getCurrentSection(currentLocationStart);
      },
      relocatedHandler(location) {
        // Ensures that when we're on the last page, we set the slider value to 100
        // otherwise, we show the slider % using the start
        if (location.atEnd) {
          this.sliderValue = 100;
        } else {
          this.sliderValue = location.start.percentage * 100;
        }
        this.updateCurrentSection(location.start);
        this.currentLocation = location.start.cfi;
        for (
          let locationIndex = location.start.location;
          locationIndex <= location.end.location;
          locationIndex++
        ) {
          this.storeVisitedPage(this.locations[locationIndex]);
        }
        if (location.end.percentage >= 1) {
          this.finish();
        }
        this.updateProgress();
        this.updateContentState();
      },
      handleSliderChanged(newSliderValue) {
        const indexOfLocationToJumpTo = Math.floor(
          (this.locations.length - 1) * (newSliderValue / 100),
        );
        const locationToJumpTo = this.locations[indexOfLocationToJumpTo];
        this.jumpToLocation(locationToJumpTo);
      },
      updateContentState() {
        let contentState;
        if (this.extraFields) {
          contentState = {
            ...this.extraFields.contentState,
            savedLocation: this.currentLocation || this.savedLocation,
            savedVisitedPages: this.visitedPages || this.savedVisitedPages,
          };
        } else {
          contentState = {
            savedLocation: this.currentLocation || this.savedLocation,
            savedVisitedPages: this.visitedPages || this.savedVisitedPages,
          };
        }
        this.$emit('updateContentState', contentState);
      },
      finish() {
        this.$emit('finished');
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './EpubStyles';

  $top-bar-height: 36px;
  $bottom-bar-height: 54px;
  $navigation-button-small: 36px;
  $navigation-button-normal: 52px;

  .epub-renderer {
    position: relative;
    // Counter-balance the padding to avoid unnecessary scroll
    height: calc(100vh - 64px);
    padding: 32px 24px;
    overflow: hidden;
    font-size: smaller;
    border-radius: $radius;
  }

  .epub-renderer:fullscreen,
  .epub-renderer.small:fullscreen {
    padding: 0;
  }

  .epub-renderer-content {
    position: relative;
    height: 100%;
    overflow: hidden;
    border: solid 1px;
    border-radius: $radius;
  }

  .top-bar-component {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: $top-bar-height;
  }

  .side-bar {
    @extend %momentum-scroll;

    position: absolute;
    top: $top-bar-height;
    bottom: $bottom-bar-height;
  }

  .side-bar-left {
    left: 0;
  }

  .side-bar-right {
    right: 0;
  }

  .toc-button {
    left: 3px;
  }

  .toc-button,
  .settings-button,
  .search-button {
    position: absolute;
    top: 2px;
    z-index: 2;
  }

  .settings-button {
    right: 67px;
  }

  .search-button {
    // Positioned to be in the exact same spot as the TopBar's SearchButton,
    // which is given opacity: 0 when this button is shown
    right: 35px;
  }

  .bottom-bar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 0 40px;
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
    @extend %momentum-scroll;

    position: absolute;
    top: $top-bar-height;
    right: 0;
    bottom: $bottom-bar-height;
    left: 0;
    max-height: calc(100vh - #{$top-bar-height + $bottom-bar-height});
    white-space: nowrap;
  }

  .epubjs-navigation {
    width: $navigation-button-normal;
  }

  .epubjs-parent {
    position: relative;
    width: calc(100% - (#{$navigation-button-normal} * 2));
  }

  /deep/ .epub-container {
    position: absolute !important;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .epub-renderer.small .epubjs-navigation {
    width: $navigation-button-small;
  }

  .epub-renderer.small .epubjs-parent {
    width: calc(100% - (#{$navigation-button-small} * 2));
  }

  .epub-renderer.scrolled {
    .epubjs-navigation {
      display: none;
    }

    .epubjs-parent {
      width: 100%;
    }

    /deep/ .epub-container .epub-view {
      min-width: 100%;
    }
  }

  .column {
    position: relative;
    display: inline-block;
    height: 100%;
    overflow: hidden;
    text-align: center;
    white-space: normal;
    vertical-align: top;
  }

</style>
