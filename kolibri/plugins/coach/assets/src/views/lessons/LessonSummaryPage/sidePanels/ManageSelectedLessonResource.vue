<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      closeButtonIconType="close"
      @closePanel="closeSidePanel"
      @shouldFocusFirstEl="() => null"
    >
      <template #header>
        <div :style="{ display: 'inline-flex' }">
          <KIconButton
            v-if="true"
            icon="back"
            @click="closeSidePanel"
          />
          <h1
            :style="{ fontWeight: '600', fontSize: '18px' }"
            class="side-panel-title"
          >
            {{ numberOfSelectedResource$({ count: resources.length }) }}
          </h1>
        </div>
      </template>

      <SelectedResources
        :resourceList="resources"
        :currentLesson="currentLesson"
        :loading="resources.length === 0"
        @removeResource="removeResource"
        @navigateToParent="navigateToParent"
      />

      <template #bottomNavigation>
        <div class="bottom-buttons-style">
          <KButton
            :primary="true"
            :text="saveLessonResources$()"
            @click="closeSidePanel()"
          />
        </div>
      </template>
    </SidePanelModal>

    <KModal
      v-if="showModal"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      :title="closeConfirmationTitle$()"
      @cancel="closeModal"
      @submit="$router.go(-1)"
    >
      {{ closeConfirmationMessage$() }}
    </KModal>
  </div>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { mapState } from 'vuex';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { ref, getCurrentInstance } from 'vue';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { PageNames } from '../../../../constants';
  import commonCoach from '../../../common';
  import SelectedResources from './SelectedResources';

  export default {
    name: 'ManageSelectedLessonResources',
    components: {
      SidePanelModal,
      SelectedResources,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const showModal = ref(false);
      const hasArrayChanged = ref(false);
      const router = getCurrentInstance().proxy.$router;

      const { saveLessonResources$, numberOfSelectedResource$ } = searchAndFilterStrings;
      const { closeConfirmationTitle$, closeConfirmationMessage$ } = enhancedQuizManagementStrings;

      function closeModal() {
        showModal.value = false;
      }

      function hasModifiedResource() {
        hasArrayChanged.value = true;
      }

      function closeSidePanel() {
        if (hasArrayChanged.value) {
          showModal.value = true;
        } else {
          router.go(-1);
        }
      }

      return {
        saveLessonResources$,
        numberOfSelectedResource$,
        closeConfirmationTitle$,
        closeConfirmationMessage$,
        showModal,
        closeModal,
        closeSidePanel,
        hasModifiedResource,
      };
    },
    data() {
      return {
        resources: [],
      };
    },
    computed: {
      // we will have to move this to composable after the final refactor
      // leaving it for now to guide the process
      ...mapState('lessonSummary', ['currentLesson', 'workingResources', 'resourceCache']),
    },
    mounted() {
      this.getResources();
    },

    methods: {
      removeResource(id) {
        this.resources = this.resources.filter(lesson => lesson.id !== id);
        this.hasModifiedResource();
      },
      navigateToParent(id) {
        this.$router.push({
          name: PageNames.LESSONS_ROOT,
          params: { classId: this.$route.params.classId, lessonId: id },
        });
      },
      // we will have to move this to the composable after the final refactor
      // leaving it for now to guide the process
      getResources() {
        const response = this.workingResources.map(resource => {
          const content = this.resourceCache[resource.contentnode_id];
          if (!content) {
            return this.missingResourceObj(resource.contentnode_id);
          }
          const tally = this.getContentStatusTally(
            content.content_id,
            this.getLearnersForLesson(this.currentLesson),
          );

          const tableRow = {
            ...content,
            node_id: content.id,
            hasAssignments: Object.values(tally).reduce((a, b) => a + b, 0),
            tally,
          };

          const link = this.resourceLink(tableRow);
          if (link) {
            tableRow.link = link;
          }

          return tableRow;
        });

        Promise.all(response).then(results => {
          this.resources = results;
        });
      },
      // we will have to move this to the composable after the final refactor
      // leaving it for now to guide the process
      resourceLink(resource) {
        if (resource.hasAssignments) {
          if (resource.kind === this.ContentNodeKinds.EXERCISE) {
            return this.classRoute(
              this.group
                ? PageNames.GROUP_LESSON_EXERCISE_LEARNER_REPORT
                : PageNames.LESSON_EXERCISE_LEARNERS_REPORT,
              { exerciseId: resource.content_id },
            );
          } else {
            return this.classRoute(
              this.group ? PageNames.GROUPS_ROOT : PageNames.LESSON_RESOURCE_LEARNERS_REPORT,
              { resourceId: resource.content_id },
            );
          }
        }
      },
    },
  };

</script>


<style scoped>

  .bottom-buttons-style {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 1em;
    margin-top: 1em;
    text-align: right;
    background-color: #ffffff;
    border-top: 1px solid black;
  }

</style>
