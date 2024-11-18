<template>

  <CoachImmersivePage
    :appBarTitle="coachString('createLessonAction')"
    :authorized="true"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="coachString('createLessonAction')"
    :route="{ name: 'LESSONS_ROOT', params: { classId } }"
  >
    <KPageContainer>
      <AssignmentDetailsModal
        ref="detailsModal"
        assignmentType="lesson"
        :assignment="{ assignments: [classId] }"
        :classId="classId"
        :groups="groups"
        :disabled="false"
        @submit="createLesson"
        @cancel="() => $router.go(-1)"
      />
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AssignmentDetailsModal from '../common/assignments/AssignmentDetailsModal';
  import commonCoach from '../common';
  import CoachImmersivePage from '../CoachImmersivePage';

  export default {
    name: 'LessonCreationPage',
    components: {
      AssignmentDetailsModal,
      CoachImmersivePage,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      classId() {
        return this.$route.params.classId;
      },
      recipients() {
        return this.getLearnersForLesson(this.currentLesson);
      },
      resourcesTable() {
        return this.workingResources.map(resource => {
          const content = this.resourceCache[resource.contentnode_id];
          if (!content) {
            return this.missingResourceObj(resource.contentnode_id);
          }

          const tally = this.getContentStatusTally(content.content_id, this.recipients);
          const tableRow = {
            ...content,
            node_id: content.id,
            avgTimeSpent: this.getContentAvgTimeSpent(content.content_id, this.recipients),
            tally,
            hasAssignments: Object.values(tally).reduce((a, b) => a + b, 0),
          };

          const link = this.resourceLink(tableRow);
          if (link) {
            tableRow.link = link;
          }

          return tableRow;
        });
      },
    },
    created() {
      const initClassInfoPromise = this.$store.dispatch('initClassInfo', this.classId);
      const getFacilitiesPromise =
        this.isSuperuser && this.$store.state.core.facilities.length === 0
          ? this.$store.dispatch('getFacilities').catch(() => {})
          : Promise.resolve();

      Promise.all([initClassInfoPromise, getFacilitiesPromise]);
    },
    mounted() {
      this.$store.commit('CORE_SET_PAGE_LOADING', false);
    },
    methods: {
      createLesson(payload) {
        this.$store
          .dispatch('lessonsRoot/createLesson', {
            classId: this.classId,
            payload,
          })
          .then(() => {
            this.showSnackbarNotification('lessonCreated');
          })
          .catch(error => {
            const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (errors) {
              this.$refs.detailsModal.handleSubmitTitleFailure();
            } else {
              this.$refs.detailsModal.handleSubmitFailure();
            }
          });
      },
      resourceLink(resource) {
        if (resource.hasAssignments) {
          if (resource.kind === this.ContentNodeKinds.EXERCISE) {
            return this.classRoute(
              this.group
                ? 'ReportsGroupReportLessonExerciseLearnerListPage'
                : 'ReportsLessonExerciseLearnerListPage',
              { exerciseId: resource.content_id },
            );
          } else {
            return this.classRoute(
              this.group
                ? 'ReportsGroupReportLessonResourceLearnerListPage'
                : 'ReportsLessonResourceLearnerListPage',
              { resourceId: resource.content_id },
            );
          }
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
