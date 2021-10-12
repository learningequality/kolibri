<template>

  <div>
    <KGrid
      class="main-content-grid"
    >
      <EmbeddedSidePanel
        v-if="!!windowIsLarge"
        :channels="channels"
        width="3"
        @openModal="handleShowSearchModal"
      />
      <KGridItem
        :layout="{ span: 3 }"
        class="side-panel"
      />
      <KGridItem
        class="card-grid"
        :layout="{ span: 8 }"
      >
        <div v-if="!displayingSearchResults">
          <h2>{{ coreString('channelsLabel') }}</h2>
          <ChannelCardGroupGrid
            v-if="channels.length"
            class="grid"
            :contents="channels"
            :genContentLink="genChannelLink"
          />
          <div class="toggle-view-buttons">
            <KIconButton
              icon="menu"
              :ariaLabel="$tr('viewAsList')"
              :color="$themeTokens.text"
              :tooltip="$tr('viewAsList')"
              @click="toggleCardView('list')"
            />
            <KIconButton
              icon="channel"
              :ariaLabel="$tr('viewAsGrid')"
              :color="$themeTokens.text"
              :tooltip="$tr('viewAsGrid')"
              @click="toggleCardView('card')"
            />
          </div>
          <h2>{{ $tr('recent') }}</h2>
          <ContentCardGroupGrid
            v-if="popular.length"
            :cardViewStyle="currentViewStyle"
            :genContentLink="genContentLink"
            :contents="trimmedPopular"
          />
        </div>
        <div v-else>
          <h2>{{ $tr('moreThanXResults') }}</h2>
          <p>{{ $tr('clearAll') }}</p>
          <KCircularLoader
            v-if="loading"
            class="loader"
            type="indeterminate"
            :delay="false"
          />
        </div>
      </KGridItem>
    </KGrid>
    <CategorySearchModal
      v-if="showSearchModal"
      :selectedCategory="currentCategory"
      @cancel="hideSearchModal"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import uniq from 'lodash/uniq';

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeProgressResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import languageSwitcherMixin from '../../../../../core/assets/src/views/language-switcher/mixin.js';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import CategorySearchModal from './CategorySearchModal';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'LibraryPage',
    metaInfo() {
      return {
        title: this.learnString('learnLabel'),
      };
    },
    components: {
      ContentCardGroupGrid,
      ChannelCardGroupGrid,
      EmbeddedSidePanel,
      CategorySearchModal,
    },
    mixins: [commonLearnStrings, commonCoreStrings, languageSwitcherMixin, responsiveWindowMixin],
    data: function() {
      return {
        showSearchModal: null,
        currentCategory: '',
        currentViewStyle: 'card',
      };
    },
    computed: {
      ...mapState('recommended', ['nextSteps', 'popular', 'resume']),
      ...mapState('topicsRoot', { channels: 'rootNodes' }),
      // screenLevel() {
      //   if (window.innerWidth < 480) {
      //     return 0;
      //   } else if (window.innerWidth > 480 && window.innerWidth < 600) {
      //     return 2;
      //   } else if (window.innerWidth > 600 && window.innerWidth < 840) {
      //     return 2;
      //   } else if (window.innerWidth > 840 && window.innerWidth < 960) {
      //     return 3;
      //   } else {
      //     return 4;
      //   }
      // },
      carouselLimit() {
        return this.windowIsSmall ? mobileCarouselLimit : desktopCarouselLimit;
      },
      trimmedPopular() {
        return this.popular.slice(0, this.carouselLimit);
      },
      trimmedNextSteps() {
        return this.nextSteps.slice(0, this.carouselLimit);
      },
      trimmedResume() {
        return this.resume.slice(0, this.carouselLimit);
      },
      displayingSearchResults() {
        return false;
      },
    },
    created() {
      if (this.$store.getters.isUserLoggedIn) {
        const contentNodeIds = uniq(
          [...this.trimmedNextSteps, ...this.trimmedPopular, ...this.trimmedResume].map(
            ({ id }) => id
          )
        );

        if (contentNodeIds.length > 0) {
          ContentNodeProgressResource.fetchCollection({ getParams: { ids: contentNodeIds } }).then(
            progresses => {
              this.$store.commit('recommended/SET_RECOMMENDED_NODES_PROGRESS', progresses);
            }
          );
        }
      }
    },
    methods: {
      genContentLink(id, isLeaf) {
        return {
          name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
          params: { id },
          query: {
            last: this.$store.state.pageName,
          },
        };
      },
      genChannelLink(channel_id) {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: { channel_id },
        };
      },
      handleShowSearchModal(value) {
        this.currentCategory = value;
        this.showSearchModal = true;
      },
      hideSearchModal() {
        this.showSearchModal = false;
      },

      toggleCardView(value) {
        this.currentViewStyle = value;
      },
    },
    $trs: {
      recent: {
        message: 'Recent',
        context:
          'Header for the section in the Library tab with resources that the learner recently engaged with.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      results: {
        message: '{results, number, integer} {results, plural, one {result} other {results}}',
        context: 'Number of results for a given term after a Library search.',
      },
      moreThanXResults: {
        message: 'More than {results} results',
        context: 'Number of results for a given term after a Library search.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      viewAsList: {
        message: 'View as list',
        context: 'Label for a button',
      },
      viewAsGrid: {
        message: 'View as grid',
        context: 'Label for a button. See also https://en.wikipedia.org/wiki/Grid_view',
      },
      clearAll: {
        message: 'Clear all',
        context: 'Clickable link which removes all currently applied search filters.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .card-grid {
    margin-top: 40px;
  }

  .side-panel {
    margin-right: 8px;
  }

  .loader {
    margin-top: 60px;
  }

  .toggle-view-buttons {
    float: right;
  }

</style>
