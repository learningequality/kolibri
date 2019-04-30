<template>

  <CoreFullscreen
    ref="epubRenderer"
    class="epub-renderer"
    :style="epubRendererStyle"
    @changeFullscreen="isInFullscreen = $event"
  >

    <LoadingError v-if="errorLoading" />

    <LoadingScreen v-else-if="!loaded" />

    <div
      v-show="loaded"
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
        :style="navigationAndEpubjsStyle"
      >
        <div
          class="column"
          :style="navigationButtonContainerStyle"
        >
          <PreviousButton
            :color="navigationButtonColor"
            :style="navigationButtonsStyle"
            :isRtl="isRtl"
            @goToPreviousPage="goToPreviousPage"
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
  import defaultManager from 'epubjs/src/managers/default';
  import { EVENTS } from 'epubjs/src/utils/constants';

  import Mark from 'mark.js';
  import debounce from 'lodash/debounce';
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

  import TableWrapFactory from './TableWrap';
  import { THEMES } from './EpubConstants';

  const FONT_SIZE_MIN = 8;
  const FONT_SIZE_MAX = 32;
  const FONT_SIZE_STEP = 4;

  const SIDE_BARS = {
    TOC: 'TOC',
    SEARCH: 'SEARCH',
    SETTINGS: 'SETTINGS',
  };

  const TOP_BAR_HEIGHT = 36;
  const BOTTOM_BAR_HEIGHT = 54;

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
        return {
          html: { ...colorStyle, ...alignmentStyle, ...fontSizeStyle },
          body: { ...colorStyle, ...alignmentStyle, ...fontSizeStyle },
          p: { ...colorStyle, ...alignmentStyle, ...lineHeightStyle },
          h1: { ...colorStyle },
          h2: { ...colorStyle },
          h3: { ...colorStyle },
          h4: { ...colorStyle },
          h5: { ...colorStyle },
          table: { width: '100%!important' },
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
        const ratio = this.windowIsSmall ? 11 / 8.5 : 8.5 / 11;
        return {
          height: `${this.elementWidth * ratio}px`,
          backgroundColor: this.$coreBgLight,
        };
      },
      navigationButtonColor() {
        return [THEMES.BLACK, THEMES.GREY].some(theme => isEqual(this.theme, theme))
          ? 'white'
          : 'black';
      },
      navigationAndEpubjsStyle() {
        return {
          backgroundColor: this.backgroundColor,
        };
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

        if (this.savedLocation) {
          this.rendition
            .display(this.savedLocation)
            .then(() => this.handleReadyRendition(width, height));
        } else {
          this.rendition.display().then(() => this.handleReadyRendition(width, height));
        }

        this.rendition.on(EVENTS.RENDITION.DISPLAY_ERROR, () => {
          this.errorLoading = true;
        });

        // TODO: Get rid of this when Firefox breaks tables properly in CSS column layout
        // Known issues: https://caniuse.com/#feat=multicolumn
        // Hook into content render, to check tables are breaking properly in column layout
        this.rendition.hooks.content.register(contents => {
          TableWrapFactory.buildFixer(contents.document).fix();
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
      handleReadyRendition(width, height) {
        this.updateRenditionTheme(this.themeStyle);

        // this is not working, hence the delay via the debounce
        // this.resizeRendition(width, height);
        this.debounceResizeRendition(width, height);

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
      calculateRenditionWidth(availableWidth) {
        return availableWidth - this.navigationButtonWidth * 2;
      },
      calculateRenditionHeight(availableHeight) {
        return availableHeight - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT;
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
      debounceResizeRendition: debounce(function(width, height) {
        this.resizeRendition(width, height);
      }, 250),
      resizeRendition(width, height) {
        if (width > 0 && height > 0) {
          let cfiToJumpTo;
          const currentLocation = this.rendition.currentLocation();
          if (currentLocation.start && currentLocation.start.cfi) {
            cfiToJumpTo = currentLocation.start.cfi;
          } else if (this.currentLocation) {
            cfiToJumpTo = this.currentLocation;
          } else if (this.locations[0]) {
            cfiToJumpTo = this.locations[0];
          } else {
            return;
          }
          this.currentLocation = cfiToJumpTo;
          this.rendition.resize(width, height);

          if (this.$refs.epubjsContainer && !this.getIframe()) {
            // Re-render since resize currently breaks
            this.jumpToLocation(this.currentLocation);
          }
        }
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

  .epub-renderer {
    position: relative;
    height: 500px;
    font-size: smaller;
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

  .navigation-and-epubjs > * {
    white-space: normal;
  }

  .column {
    position: relative;
    display: inline-block;
    height: 100%;
    overflow: hidden;
    text-align: center;
    vertical-align: top;
  }

</style>
