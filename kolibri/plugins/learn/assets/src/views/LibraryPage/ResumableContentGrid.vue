<template>

  <div v-if="resumableContentNodes.length">
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
        @openCopiesModal="setCopies"
        @toggleInfoPanel="toggleInfoPanel"
      />
    </div>
    <KButton
      v-if="moreResumableContentNodes.length"
      data-test="more-resumable-nodes-button"
      appearance="basic-link"
      @click="fetchMoreResumableContentNodes"
    >
      {{ coreString('viewMoreAction') }}
    </KButton>

    <CopiesModal
      @submit="clearCopies"
    />

    <FullScreenSidePanel
      v-if="sidePanelContent"
      data-test="content-side-panel"
      alignment="right"
      :closeButtonIconType="close"
      @closePanel="sidePanelContent = null"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <template #header>
        <!-- Flex styles tested in ie11 and look good. Ensures good spacing between
            multiple chips - not a common thing but just in case -->
        <div
          v-for="(activity, index) in sidePanelContent.learning_activities"
          :key="activity"
          :ref="el => activityRefs[activity + index] = el"
          class="side-panel-chips"
          :class="$computedClass({ '::after': {
            content: '',
            flex: 'auto'
          } })"
        >
          <LearningActivityChip
            class="chip"
            style="margin-left: 8px; margin-bottom: 8px;"
            :kind="activity"
          />
        </div>
      </template>

      <BrowseResourceMetadata
        ref="resourcePanel"
        :content="sidePanelContent"
        :showLocationsInChannel="true"
      />
    </FullScreenSidePanel>
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useCopies from '../../composables/useCopies';
  import useLearnerResources from '../../composables/useLearnerResources';
  import BrowseResourceMetadata from '../BrowseResourceMetadata';
  import CopiesModal from '../CopiesModal';
  import LearningActivityChip from '../LearningActivityChip';
  import LibraryAndChannelBrowserMainContent from '../LibraryAndChannelBrowserMainContent';

  export default {
    name: 'ResumableContentGrid',
    components: {
      BrowseResourceMetadata,
      CopiesModal,
      FullScreenSidePanel,
      LearningActivityChip,
      LibraryAndChannelBrowserMainContent,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const {
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
      } = useLearnerResources();

      const { setCopies, clearCopies } = useCopies();

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
        setCopies,
        clearCopies,
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
