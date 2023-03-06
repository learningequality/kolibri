<template>

  <div v-if="(resumableContentNodes || []).length">
    <div
      v-if="!(windowIsSmall)"
      class="toggle-view-buttons"
      data-test="toggle-view-buttons"
    >
      <KIconButton
        icon="menu"
        :ariaLabel="$tr('viewAsList')"
        :color="$themeTokens.text"
        :tooltip="$tr('viewAsList')"
        :disabled="currentCardViewStyle === 'list'"
        @click="toggleCardView('list')"
      />
      <KIconButton
        icon="channel"
        :ariaLabel="$tr('viewAsGrid')"
        :color="$themeTokens.text"
        :tooltip="$tr('viewAsGrid')"
        :disabled="currentCardViewStyle === 'card'"
        @click="toggleCardView('card')"
      />
    </div>
    <div data-test="recent-content-nodes-title">
      <h2>
        {{ $tr('recent') }}
      </h2>
      <LibraryAndChannelBrowserMainContent
        :contents="resumableContentNodes"
        data-test="resumable-content-card-grid"
        :currentCardViewStyle="currentCardViewStyle"
        :gridType="1"
        @openCopiesModal="copies => displayedCopies = copies"
        @toggleInfoPanel="$emit('setSidePanelMetadataContent', $event)"
      />
    </div>
    <KButton
      v-if="(moreResumableContentNodes || []).length"
      data-test="more-resumable-nodes-button"
      appearance="basic-link"
      @click="fetchMoreResumableContentNodes"
    >
      {{ coreString('viewMoreAction') }}
    </KButton>

    <CopiesModal
      v-if="displayedCopies.length"
      :copies="displayedCopies"
      @submit="displayedCopies = []"
    />
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useLearnerResources from '../../composables/useLearnerResources';
  import CopiesModal from '../CopiesModal';
  import LibraryAndChannelBrowserMainContent from '../LibraryAndChannelBrowserMainContent';

  export default {
    name: 'ResumableContentGrid',
    components: {
      CopiesModal,
      LibraryAndChannelBrowserMainContent,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const {
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
      } = useLearnerResources();

      var sidePanelContent = ref(null);
      const toggleInfoPanel = content => (sidePanelContent.value = content);

      const activityRefs = {};

      const findFirstEl = () => {
        const activityKeys = Object.keys(activityRefs);
        const firstActivity = activityKeys.find(key => key.endsWith('0'));
        if (firstActivity) {
          activityKeys[firstActivity].value.focusFirstEl();
        }
      };

      return {
        activityRefs,
        findFirstEl,
        sidePanelContent,
        toggleInfoPanel,
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
      };
    },
    props: {
      currentCardViewStyle: {
        type: String,
        default: 'card',
      },
    },
    data() {
      return {
        displayedCopies: [],
      };
    },
    methods: {
      toggleCardView(value) {
        this.$emit('setCardStyle', value);
      },
    },
    $trs: {
      recent: {
        message: 'Recent',
        context:
          'Header for the section in the Library tab with resources that the learner recently engaged with.',
      },
      viewAsList: {
        message: 'View as list',
        context: 'Label for a button used to view resources as a list.',
      },
      viewAsGrid: {
        message: 'View as grid',
        context: 'Label for a button used to view resources as a grid.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .toggle-view-buttons {
    float: right;
  }

</style>
