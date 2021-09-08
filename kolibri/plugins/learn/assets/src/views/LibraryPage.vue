<template>

  <div>
    <KGrid
      class="main-content-grid"
    >
      <EmbeddedSidePanel
        :channels="channels"
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
          <h2>Channels</h2>
          <ChannelCardGroupGrid
            v-if="channels.length"
            class="grid"
            :contents="channels"
            :genContentLink="genChannelLink"
          />
          <h2>Recent</h2>
          <ContentCardGroupGrid
            v-if="popular.length"
            :genContentLink="genContentLink"
            :contents="trimmedPopular"
          />

          <template v-if="nextSteps.length">
            <ContentCardGroupGrid
              :genContentLink="genContentLink"
              :contents="trimmedNextSteps"
            />
          </template>

          <template v-if="resume.length">
            <ContentCardGroupGrid
              :genContentLink="genContentLink"
              :contents="trimmedResume"
            />
          </template>
        </div>
        <div v-else>
          <h2>{{ results }}</h2>
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
  import languageSwitcherMixin from '../../../../../core/assets/src/views/language-switcher/mixin.js';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import EmbeddedSidePanel from './EmbeddedSidePanel';
  import CategorySearchModal from './CategorySearchModal';

  // import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

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
    mixins: [commonLearnStrings, languageSwitcherMixin, responsiveWindowMixin],
    data: function() {
      return {
        showSearchModal: null,
        currentCategory: '',
      };
    },
    computed: {
      ...mapState('recommended', ['nextSteps', 'popular', 'resume']),
      ...mapState('topicsRoot', { channels: 'rootNodes' }),
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
      results() {
        return 'results';
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

</style>
