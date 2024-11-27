<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="closeSidePanel"
    @shouldFocusFirstEl="() => null"
  >
    <template #header>
      <div style="display: flex; gap: 8px; align-items: center">
        <KIconButton
          v-if="goBack"
          icon="back"
          @click="goBack"
        />
        <h1 class="side-panel-title">{{ view.title || $tr('manageLessonResourcesTitle') }}</h1>
      </div>
    </template>
    <div v-if="loading">
      <KCircularLoader />
    </div>
    <component
      :is="view.component"
      v-else
    />

    <template #bottomNavigation>
      <div class="bottom-nav-container">
        <KButton
          primary
          :text="saveAndFinishAction$()"
          @click="closeSidePanel"
        />
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { PageNames } from '../../../../../constants';
  import SelectionIndex from './subPages/SelectionIndex';
  import useResourceSelection from './useResourceSelection';
  import SelectFromBookmarks from './subPages/SelectFromBookmarks.vue';
  import SelectFromChannels from './subPages/SelectFromChannels.vue';

  const ResourceSelectionView = {
    SELECTION_INDEX: 'selectionIndex',
    SELECT_FROM_BOOKMARKS: 'selectFromBookmarks',
    SELECT_FROM_CHANNELS: 'selectFromChannels',
  };

  export default {
    name: 'LessonResourceSelection',
    components: {
      SidePanelModal,
      SelectionIndex,
      SelectFromBookmarks,
      SelectFromChannels,
    },
    setup() {
      const { loading } = useResourceSelection();

      const { saveAndFinishAction$ } = coreStrings;

      return {
        loading,
        saveAndFinishAction$,
      };
    },
    computed: {
      viewId() {
        const { viewId } = this.$route.params;
        if (Object.values(ResourceSelectionView).includes(viewId)) {
          return viewId;
        }
        return ResourceSelectionView.SELECTION_INDEX;
      },
      view() {
        const componentMap = {
          [ResourceSelectionView.SELECTION_INDEX]: {
            title: 'Select resources',
            component: SelectionIndex,
          },
          [ResourceSelectionView.SELECT_FROM_BOOKMARKS]: {
            title: 'Select from bookmarks',
            component: SelectFromBookmarks,
            back: ResourceSelectionView.SELECTION_INDEX,
          },
          [ResourceSelectionView.SELECT_FROM_CHANNELS]: {
            title: 'Select from channels',
            component: SelectFromChannels,
            back: ResourceSelectionView.SELECTION_INDEX,
          },
        };

        return componentMap[this.viewId];
      },
      goBack() {
        const { back } = this.view;
        if (!back) {
          return null;
        }
        return () => {
          this.$router.push({ name: 'LESSON_SELECT_RESOURCES', params: { viewId: back } });
        };
      },
    },
    methods: {
      closeSidePanel() {
        this.$router.push({
          name: PageNames.LESSON_SUMMARY_BETTER,
        });
      },
    },
    $trs: {
      manageLessonResourcesTitle: {
        message: 'Manage lesson resources',
        context:
          "In the 'Manage lesson resources' coaches can add new/remove resource material to a lesson.",
      },
    },
  };

</script>


<style scoped>

  .side-panel-title {
    margin-top: 20px;
    font-size: 18px;
  }

  .bottom-nav-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

</style>
