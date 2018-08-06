<template>

  <core-fullscreen
    ref="epubRenderer"
    class="epub-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >

    <div class="top-bar">
      <UiIconButton
        type="secondary"
        @click="handleTocToggle"
      >
        <mat-svg
          name="menu"
          category="navigation"
        />
      </UiIconButton>
      <UiIconButton
        type="secondary"
        @click="handleSearchToggle"
      >
        <mat-svg
          name="search"
          category="action"
        />
      </UiIconButton>

      <CoreDropdownMenu>
        <UiIconButton
          slot="button"
          type="secondary"
        >
          <mat-svg
            name="format_size"
            category="editor"
          />
        </UiIconButton>

        <template slot="menuOptions">
          <CoreMenuOption
            label="Increase font size"
            @select="increaseFontSize"
          />
          <CoreMenuOption
            label="Reset font size"
            @select="resetFontSize"
          />
          <CoreMenuOption
            label="Decrease font size"
            @select="decreaseFontSize"
          />
        </template>
      </CoreDropdownMenu>

      <CoreDropdownMenu>
        <UiIconButton
          slot="button"
          type="secondary"
        >
          <mat-svg
            name="format_color_fill"
            category="editor"
          />
        </UiIconButton>

        <template slot="menuOptions">
          <CoreMenuOption
            label="Light"
            @select="setLightTheme"
          />
          <CoreMenuOption
            label="Dark"
            @select="setDarkTheme"
          />
          <CoreMenuOption
            label="Sepia"
            @select="setSepiaTheme"
          />
        </template>
      </CoreDropdownMenu>
      <UiIconButton
        type="secondary"
        @click="$refs.epubRenderer.toggleFullscreen()"
      >
        <mat-svg
          v-if="isInFullscreen"
          name="fullscreen_exit"
          category="navigation"
        />
        <mat-svg
          v-else
          name="fullscreen"
          category="navigation"
        />
      </UiIconButton>

      <UiIconButton
        type="secondary"
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
        type="secondary"
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
    </div>

    <SideBar
      v-if="tocSideBarIsOpen"
      class="side-bar"
    >
      <h2
        slot="sideBarHeader"
        class="toc-header"
      >
        {{ $tr('tableOfContents') }}
      </h2>

      <div slot="sideBarMain">
        <nav>
          <ul class="toc-list">
            <li
              v-for="(item, index) in toc"
              :key="index"
              class="toc-list-item"
            >
              <KButton
                :text="item.label"
                appearance="basic-link"
                @click="handleTocNavigation(item)"
              />
            </li>
          </ul>
        </nav>
      </div>
    </SideBar>

    <SideBar
      v-else-if="searchSideBarIsOpen"
      class="side-bar"
    >
      <form
        slot="sideBarHeader"
        @submit.prevent="handleSearchInput"
      >
        <input
          ref="searchInput"
          autofocus="true"
          v-model.trim="searchQuery"
        >
        <UiIconButton
          type="secondary"
          buttonType="submit"
          class="search-submit-button"
        >
          <mat-svg
            name="search"
            category="action"
          />
        </UiIconButton>
      </form>

      <div slot="sideBarMain">
        <transition
          name="search-results"
          mode="out-in"
        >
          <KCircularLoader
            v-if="searchIsLoading"
            :delay="false"
          />
          <div v-else>
            <transition
              name="search-results"
              mode="out-in"
            >
              <p v-if="noSearchResults">{{ $tr('noSearchResults') }}</p>
              <div v-else-if="searchResults.length > 0">
                <p>{{ $tr('numberOfSearchResults', { count: searchResults.length}) }}</p>
                <ol class="search-results-list">
                  <li
                    v-for="(item, index) in searchResultsToDisplay"
                    :key="index"
                    class="toc-list-item"
                  >
                    <KButton
                      appearance="basic-link"
                      @click="handleSearchResultNavigation(item)"
                    >
                      <template v-html="item.html"></template>
                    </KButton>
                  </li>
                </ol>
              </div>
            </transition>
          </div>
        </transition>
      </div>
    </SideBar>


    <div
      ref="epubjsContainer"
      class="epubjs-container"
      :class="{ 'epubjs-container-push-right': sideBarOpen }"
    >
    </div>
  </core-fullscreen>

</template>


<script>

  import { mapGetters } from 'vuex';
  import Epub from 'epubjs/lib/epub';
  import manager from 'epubjs/lib/managers/default';
  import iFrameView from 'epubjs/lib/managers/views/iframe';
  import KButton from 'kolibri.coreVue.components.KButton';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import SideBar from './SideBar';
  import CoreDropdownMenu from './CoreDropdownMenu';

  const FONT_SIZE_INC = 2;
  const MIN_FONT_SIZE = 8;
  const DEFAULT_FONT_SIZE = 16;
  const MAX_FONT_SIZE = 24;

  const THEMES = {
    LIGHT: 'LIGHT',
    DARK: 'DARK',
    SEPIA: 'SEPIA',
  };

  const SIDE_BARS = {
    TOC: 'TOC',
    SEARCH: 'SEARCH',
  };

  export default {
    name: 'EpubRendererIndex',
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
      tableOfContents: 'Table of contents',
      noSearchResults: 'No search results',
      tryABetterSearch: 'Too ',
      numberOfSearchResults:
        '{count, number, integer} {count, plural, one {match} other {matches}}',
    },
    components: {
      KButton,
      UiIconButton,
      CoreFullscreen,
      SideBar,
      CoreMenuOption,
      CoreDropdownMenu,
      KCircularLoader,
    },
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin],
    data: () => ({
      book: null,
      rendition: null,
      toc: [],
      searchResults: [],
      searchQuery: '',
      noSearchResults: false,
      searchIsLoading: false,
      sideBarOpen: null,
      theme: THEMES.LIGHT,
      fontSize: DEFAULT_FONT_SIZE,
      isInFullscreen: false,
      totalPages: null,
    }),
    computed: {
      ...mapGetters(['sessionTimeSpent']),
      epubURL() {
        return 'http://localhost:8000/content/storage/epub2.epub';
      },
      backgroundColor() {
        switch (this.theme) {
          case THEMES.DARK:
            return 'black';
          case THEMES.SEPIA:
            return '#f1e7d0';
          default:
            return 'white';
        }
      },
      color() {
        switch (this.theme) {
          case THEMES.DARK:
            return 'white';
          case THEMES.SEPIA:
            return 'black';
          default:
            return 'black';
        }
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
      searchSideBarIsOpen() {
        return this.sideBarOpen === SIDE_BARS.SEARCH;
      },
      searchResultsToDisplay() {
        return this.searchResults.slice(0, 100);
      },
      targetTime() {
        return this.totalPages * 30;
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
          this.$nextTick().then(() => {
            const searchInput = this.$refs.searchInput;
            if (searchInput) {
              searchInput.focus();
            }
          });
        }
      },
    },
    beforeMount() {
      global.ePub = Epub;
      this.book = new Epub(this.epubURL);
    },
    mounted() {
      this.rendition = this.book.renderTo(this.$refs.epubjsContainer, {
        manager,
        view: iFrameView,
      });
      this.rendition.display().then(() => {
        // Loaded
        if (this.book.navigation) {
          this.toc = this.book.navigation.toc;
        }
        this.rendition.resize('700px', '700px');
        this.rendition.on('resized', (width, height) => {
          console.log('Resized to:', width, height);
        });
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
      handleTocNavigation(item) {
        this.rendition.display(item.href);
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
      setLightTheme() {
        this.theme = THEMES.LIGHT;
      },
      setDarkTheme() {
        this.theme = THEMES.DARK;
      },
      setSepiaTheme() {
        this.theme = THEMES.SEPIA;
      },
      handleSearchInput() {
        // ww
        // const searchQuery = this.searchQuery.toLowerCase();
        // if (searchQuery.length > 0) {
        //   this.searchIsLoading = true;
        //   this.search(searchQuery).then(searchResults => {
        //     const isWholeWord = new RegExp(`\\b${searchQuery}\\b`);
        //     const searchResultsWithWholeWord = searchResults.filter(result =>
        //       isWholeWord.test(result.excerpt.toLowerCase())
        //     );
        //     // const searchResultsWithHtml = searchResultsWithWholeWord.map(result => {
        //     //   const r = new RegExp(searchQuery);
        //     //   const html = result.excerpt.replace(r, 'www $&www');
        //     //   return {
        //     //     ...result,
        //     //     html
        //     //   };

        //     // });
        //     this.noSearchResults = searchResultsWithWholeWord.length === 0;
        //     this.searchResults = searchResultsWithWholeWord;
        //     this.searchIsLoading = false;
          //   });
        // }
      },
      search(searchQuery) {
        return Promise.all(
          this.book.spine.spineItems.map(item =>
            item
              .load(this.book.load.bind(this.book))
              .then(item.find.bind(item, searchQuery))
              .finally(item.unload.bind(item))
          )
        ).then(searchResults => Promise.resolve([].concat.apply([], searchResults)));
      },
      handleSearchResultNavigation(searchResult) {
        this.rendition.display(searchResult.cfi);
      },
      updateProgress() {
        this.$emit('updateProgress', this.sessionTimeSpent / this.targetTime);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .epub-renderer {
    position: relative;
    min-height: 400px;
  }

  .epubjs-container {
    position: absolute;
    top: 48px;
    right: 0;
    bottom: 0;
    left: 0;
    overflow: hidden;
    background-color: #ffffff;
    transition: left 0.2s ease;
  }

  .epubjs-container-push-right {
    left: 250px;
  }

  .top-bar {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 4;
    box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

  .side-bar {
    position: absolute;
    top: 49px;
    bottom: 0;
    left: 0;
    z-index: 4;
    width: 250px;
    height: calc(100% - 49px);
    word-wrap: break-word;
    background-color: $core-bg-canvas;
    box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
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

  .search-results-enter-active,
  .search-results-leave-active {
    transition: opacity 0.05s;
  }
  .search-results-enter,
  .search-results-leave-to {
    opacity: 0;
  }

</style>
