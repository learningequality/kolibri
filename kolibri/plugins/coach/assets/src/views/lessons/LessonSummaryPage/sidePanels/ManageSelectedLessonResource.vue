<template>

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
          @click="$router.go(-1)"
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

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { mapState } from 'vuex';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { PageNames } from '../../../../constants';
  import commonCoach from '../../../common';
  import SelectedResources from './SelectedResources';

  export default {
    name: 'ManageSelectedLessonResources',
    components: {
      SidePanelModal,
      SelectedResources,
    },
    mixins: [commonCoach],
    setup() {
      const { saveLessonResources$, numberOfSelectedResource$ } = searchAndFilterStrings;
      return {
        saveLessonResources$,
        numberOfSelectedResource$,
      };
    },
    data() {
      return {
        resources: [],
      };
    },
    computed: {
      ...mapState('lessonSummary', ['currentLesson', 'workingResources', 'resourceCache']),
      lessonOrderListButtonBorder() {
        return {
          borderBottom: `1px solid ${this.$themePalette.grey.v_200}`,
          height: `4em`,
          marginTop: `0.5em`,
        };
      },
    },
    mounted() {
      setTimeout(() => {
        this.getResources();
      }, 2000);
    },
    methods: {
      removeResource(id) {
        this.resources = this.resources.filter(lesson => lesson.id !== id);
      },
      navigateToParent(id) {
        this.$router.push({
          name: PageNames.LESSONS_ROOT,
          params: { classId: this.$route.params.classId, lessonId: id },
        });
      },
      getResources() {
        const response = this.workingResources.map(resource => {
          const content = this.resourceCache[resource.contentnode_id];
          if (!content) {
            return this.missingResourceObj(resource.contentnode_id);
          }
          const tally = this.getContentStatusTally(
            content.content_id,
            this.getLearnersForLesson(this.currentLesson)
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

        Promise.all(response)
          .then(results => {
            this.resources = results;
          })
      },
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
      closeSidePanel() {
        this.$router.push({
          name: PageNames.LESSONS_ROOT,
          params: { classId: this.$route.params.classId },
        });
      },
    },
    $trs: {},
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
