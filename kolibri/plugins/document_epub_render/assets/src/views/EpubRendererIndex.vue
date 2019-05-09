<template>

  <CoreFullscreen
    ref="epubRenderer"
    class="epub-renderer"
    :class="{small: windowIsSmall, scrolled: scrolled}"
    :style="epubRendererStyle"
    @changeFullscreen="isInFullscreen = $event"
  >

    <LoadingError v-if="errorLoading" />

    <LoadingScreen v-else-if="!loaded" />

    <div
      class="epub-renderer-content"
      :dir="dir"
      @mousedown.stop="handleMouseDown"
      @keyup.esc="closeSideBar"
    >

      <TopBar
        ref="topBar"
        class="top-bar"
        :isInFullscreen="isInFullscreen"
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

        <transition name="fade">
          <TableOfContentsSideBar
            v-show="tocSideBarIsOpen"
            ref="tocSideBar"
            :toc="toc"
            :currentSection="currentSection"
            class="side-bar side-bar-left"
            @tocNavigation="handleTocNavigation"
          />
        </transition>
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

        <transition name="fade">
          <SettingsSideBar
            v-show="settingsSideBarIsOpen"
            ref="settingsSideBar"
            class="side-bar side-bar-right"
            :theme="theme"
            :decreaseFontSizeDisabled="decreaseFontSizeDisabled"
            :increaseFontSizeDisabled="increaseFontSizeDisabled"
            @decreaseFontSize="decreaseFontSize"
            @increaseFontSize="increaseFontSize"
            @setTheme="setTheme"
          />
        </transition>
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

        <transition name="fade">
          <SearchSideBar
            v-show="searchSideBarIsOpen"
            ref="searchSideBar"
            class="side-bar side-bar-right"
            :book="book"
            @newSearchQuery="handleNewSearchQuery"
            @navigateToSearchResult="handleNavigateToSearchResult"
          />
        </transition>
      </FocusLock>

      <div
        class="navigation-and-epubjs"
        :style="backgroundColorStyle"
      >
        <div
          class="column epubjs-navigation"
        >
          <PreviousButton
            :color="navigationButtonColor"
            :style="backgroundColorStyle"
            :isRtl="isRtl"
            @goToPreviousPage="goToPreviousPage"
          />
        </div>
        <div
          ref="epubjsContainer"
          class="column epubjs-parent"
          :style="backgroundColorStyle"
        >
        </div>
        <div
          class="column epubjs-navigation"
        >
          <NextButton
            :color="navigationButtonColor"
            :style="backgroundColorStyle"
            :isRtl="isRtl"
            @goToNextPage="goToNextPage"
          />
        </div>
      </div>

      <BottomBar
        class="bottom-bar"
        :locationsAreReady="locations.length > 0"
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
  import Lockr from 'lockr';

  import FocusLock from 'vue-focus-lock';

  import { mapGetters } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';
  import { getContentLangDir } from 'kolibri.utils.i18n';

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

  import { THEMES } from './EpubConstants';

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
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin, themeMixin],
    data: () => ({
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
      updateContentStateInterval: null,
    }),
    computed: {
      ...mapGetters(['sessionTimeSpent']),
      savedLocation() {
        if (this.extraFields && this.extraFields.contentState) {
          return this.extraFields.contentState.savedLocation;
        }
        return null;
      },
      epubURL() {
        return this.defaultFile.storage_url;
      },
      backgroundColor() {
        return this.theme.backgroundColor;
      },
      backgroundColorStyle() {
        return {
          backgroundColor: this.backgroundColor,
        };
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
          'text-align': `${this.isRtl ? 'right' : 'left'}!important`,
        };
        const fontSizeStyle = this.fontSize ? { 'font-size': `${this.fontSize}!important` } : {};

        const lineHeightStyle = {
          'line-height': `1.4em!important`,
        };

        // Scrolled styles that help calculating true content width in SandboxIFrameView
        const htmlScrolledStyle = this.scrolled ? { display: 'flex', minWidth: '100vw' } : {};
        const bodyScrolledStyle = this.scrolled
          ? { width: 'auto!important', minWidth: '100vw' }
          : {};

        return {
          html: { ...colorStyle, ...alignmentStyle, ...fontSizeStyle, ...htmlScrolledStyle },
          body: { ...colorStyle, ...alignmentStyle, ...fontSizeStyle, ...bodyScrolledStyle },
          p: { ...colorStyle, ...alignmentStyle, ...lineHeightStyle },
          h1: { ...colorStyle },
          h2: { ...colorStyle },
          h3: { ...colorStyle },
          h4: { ...colorStyle },
          h5: { ...colorStyle },
          // override inline table width
          table: { maxWidth: '100vw!important' },
          'p:first-of-type::first-letter': { ...colorStyle },
          video: { 'max-width': '100%' },
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
          backgroundColor: this.$coreBgLight,
        };
      },
      navigationButtonColor() {
        return [THEMES.BLACK, THEMES.GREY].some(theme => isEqual(this.theme, theme))
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
      expectedTimeToRead() {
        const WORDS_PER_MINUTE = 300;
        const CHARS_PER_WORD = 10;
        const numberOfWords = (this.locations.length * LOCATIONS_INTERVAL) / CHARS_PER_WORD;
        const seconds = (numberOfWords * 60) / WORDS_PER_MINUTE;
        return seconds;
      },
      dir() {
        return getContentLangDir(this.lang);
      },
      isRtl() {
        return this.dir === 'rtl';
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
          this.updateRenditionTheme(newTheme);
          Lockr.set(EPUB_RENDERER_SETTINGS_KEY, {
            theme: this.theme,
            fontSize: this.fontSize,
          });
        }
      },
    },
    created() {
      // Try to load the appropriate directional CSS for the particular content
      this.cssPromise = this.$options.contentModule.loadDirectionalCSS(this.dir);
    },
    beforeMount() {
      global.ePub = Epub;
      this.book = new Epub(this.epubURL);

      const { savedTheme = THEMES.WHITE, savedFontSize } =
        Lockr.get(EPUB_RENDERER_SETTINGS_KEY) || {};
      this.theme = savedTheme;
      this.fontSize = savedFontSize;
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

            return this.rendition.q.enqueue(() => {
              this.rendition.resize();
            });
          })
          .then(() => {
            this.handleReadyRendition();
          });

        this.rendition.on(EVENTS.RENDITION.DISPLAY_ERROR, () => {
          this.errorLoading = true;
        });
      });
      this.book.on(EVENTS.BOOK.OPEN_FAILED, () => {
        this.errorLoading = true;
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
          this.$emit('updateProgress', this.sessionTimeSpent / this.expectedTimeToRead);
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
        });
      },
      updateRenditionTheme(newTheme) {
        const themeName = JSON.stringify(newTheme);
        this.rendition.themes.register(themeName, newTheme);
        this.rendition.themes.select(themeName);
      },
      getIframe() {
        return this.$refs.epubjsContainer.querySelector('iframe');
      },
      handleKeyUps(event) {
        switch (event.which) {
          case 37:
            this.goToPreviousPage().then(() => this.getIframe().focus());
            break;
          case 39:
            this.goToNextPage().then(() => this.getIframe().focus());
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
      handleTocToggle() {
        this.sideBarOpen === SIDE_BARS.TOC
          ? this.closeSideBar()
          : (this.sideBarOpen = SIDE_BARS.TOC);
      },
      handleSearchToggle() {
        this.sideBarOpen === SIDE_BARS.SEARCH
          ? this.closeSideBar()
          : (this.sideBarOpen = SIDE_BARS.SEARCH);
      },
      handleSettingToggle() {
        this.sideBarOpen === SIDE_BARS.SETTINGS
          ? this.closeSideBar()
          : (this.sideBarOpen = SIDE_BARS.SETTINGS);
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
        const iframe = this.getIframe();
        const iframeBody = iframe.contentWindow.document.body;
        const fontSize = window.getComputedStyle(iframeBody).getPropertyValue('font-size');
        return fontSize;
      },
      increaseFontSize() {
        const currentFontSize = this.getCurrentFontSize();
        const fontSizeNumericValue = parseFloat(currentFontSize);
        const newFontSizeNumericValue = Math.min(
          fontSizeNumericValue + FONT_SIZE_STEP,
          FONT_SIZE_MAX
        );
        this.fontSize = `${newFontSizeNumericValue}px`;
      },
      decreaseFontSize() {
        const currentFontSize = this.getCurrentFontSize();
        const fontSizeNumericValue = parseFloat(currentFontSize);
        const newFontSizeNumericValue = Math.max(
          fontSizeNumericValue - FONT_SIZE_STEP,
          FONT_SIZE_MIN
        );
        this.fontSize = `${newFontSizeNumericValue}px`;
      },
      setTheme(theme) {
        this.theme = theme;
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
          this.markInstance = new Mark(this.getIframe().contentDocument.querySelector('body'));
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
        this.currentLocation = location.start.cfi;
        this.updateContentState();
      },
      handleSliderChanged(newSliderValue) {
        const indexOfLocationToJumpTo = Math.floor(
          (this.locations.length - 1) * (newSliderValue / 100)
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
          };
        } else {
          contentState = { savedLocation: this.currentLocation || this.savedLocation };
        }
        this.$emit('updateContentState', contentState);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  $navigation-button-small: 36px;
  $navigation-button-normal: 52px;

  .epub-renderer {
    position: relative;
    padding-top: calc(100% * 8.5 / 11);
    font-size: smaller;
  }

  .epub-renderer.small {
    padding-top: calc(100% * 11 / 8.5);
  }

  .epub-renderer.normalize-fullscreen {
    padding-top: 0 !important;
  }

  .epub-renderer-content {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
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

  .fade-enter-active,
  .fade-leave-active {
    transition: all 0.1s ease;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
    transform: scale3d(0.3, 0.3, 0.3);
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

    /deep/ .epub-container {
      .epub-view {
        min-width: 100%;
      }
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
