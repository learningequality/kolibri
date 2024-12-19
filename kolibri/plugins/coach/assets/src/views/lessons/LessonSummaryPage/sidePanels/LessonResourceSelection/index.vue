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
          @click="goBack()"
        />
        <h1 class="side-panel-title">{{ title }}</h1>
      </div>
    </template>
    <div v-if="loading">
      <KCircularLoader />
    </div>

    <router-view
      v-else
      :setTitle="setTitle"
      :setGoBack="setGoBack"
      :topic="topic"
      :channelsFetch="channelsFetch"
      :bookmarksFetch="bookmarksFetch"
      :treeFetch="treeFetch"
      :selectionRules="selectionRules"
      :selectedResources="selectedResources"
      @selectResources="selectResources"
      @deselectResources="deselectResources"
      @setSelectedResources="setSelectedResources"
    />

    <template #bottomNavigation>
      <div class="bottom-nav-container">
        <KButtonGroup>
          <KRouterLink
            v-if="selectedResources.length > 0"
            :to="{ name: PageNames.LESSON_PREVIEW_SELECTED_RESOURCES }"
          >
            {{ selectedResourcesMessage }}
          </KRouterLink>
          <KButton
            primary
            :text="saveAndFinishAction$()"
            @click="closeSidePanel"
          />
        </KButtonGroup>
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import { PageNames } from '../../../../../constants';
  import { coachStrings } from '../../../../common/commonCoachStrings';
  import useResourceSelection from '../../../../../composables/useResourceSelection';

  export default {
    name: 'LessonResourceSelection',
    components: {
      SidePanelModal,
    },
    setup() {
      const {
        loading,
        topic,
        channelsFetch,
        bookmarksFetch,
        treeFetch,
        selectionRules,
        selectedResources,
        selectResources,
        deselectResources,
        setSelectedResources,
      } = useResourceSelection();

      const { saveAndFinishAction$ } = coreStrings;

      return {
        loading,
        selectedResources,
        topic,
        channelsFetch,
        bookmarksFetch,
        treeFetch,
        selectionRules,
        selectResources,
        deselectResources,
        setSelectedResources,
        saveAndFinishAction$,
      };
    },
    data() {
      return {
        title: '',
        goBack: null,
        PageNames,
      };
    },
    computed: {
      totalSize() {
        let size = 0;
        this.selectedResources.forEach(resource => {
          const { files = [] } = resource;
          files.forEach(file => {
            size += file.file_size || 0;
          });
        });
        return size;
      },
      selectedResourcesMessage() {
        const { someResourcesSelected$ } = coachStrings;
        return someResourcesSelected$({
          count: this.selectedResources.length,
          bytesText: bytesForHumans(this.totalSize),
        });
      },
    },
    methods: {
      closeSidePanel() {
        this.$router.push({
          name: PageNames.LESSON_SUMMARY_BETTER,
        });
      },
      setTitle(title) {
        this.title = title;
      },
      setGoBack(goBack) {
        this.goBack = goBack;
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
