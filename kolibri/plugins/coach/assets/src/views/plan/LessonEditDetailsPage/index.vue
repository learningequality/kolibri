<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="false"
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
    :appBarTitle="$tr('appBarTitle')"
    :pageTitle="$tr('pageTitle', { title: lesson.title })"
    :showSubNav="false"
    :immersivePageRoute="previousPageRoute"
  >

    <KPageContainer v-if="!loading">
      <AssignmentDetailsForm
        v-bind="formProps"
        :disabled="disabled"
        :initialAdHocLearners="initialAdHocLearners"
        @cancel="goBackToSummaryPage"
        @submit="handleSaveChanges"
      >

        <section
          v-if="showResourcesTable"
          slot="resourceTable"
        >
          <h2 class="resource-header">
            {{ coreString('resourcesLabel') }}
          </h2>
          <ResourceListTable
            v-show="!disabled"
            :resources.sync="updatedResources"
          />
        </section>
      </AssignmentDetailsForm>

    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import isEqual from 'lodash/isEqual';
  import isEmpty from 'lodash/isEmpty';
  import { LessonResource } from 'kolibri.resources';
  import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { CoachCoreBase } from '../../common';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import AssignmentDetailsModal from '../assignments/AssignmentDetailsModal';
  import ResourceListTable from './EditDetailsResourceListTable';

  export default {
    name: 'LessonEditDetailsPage',
    components: {
      AssignmentDetailsForm: AssignmentDetailsModal,
      CoreBase: CoachCoreBase,
      ResourceListTable,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      showResourcesTable: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        lesson: {
          title: '',
          description: '',
          lesson_assignments: [],
          resources: [],
          is_active: false,
        },
        // A copy of lesson.resources
        updatedResources: [],
        loading: true,
        disabled: false,
      };
    },
    computed: {
      ...mapGetters('adHocLearners', ['hasAdHocLearnersAssigned']),
      formProps() {
        return {
          assignmentType: 'lesson',
          classId: this.$route.params.classId,
          groups: this.$store.getters['classSummary/groups'],
          initialActive: this.lesson.is_active,
          initialSelectedCollectionIds: this.initialSelectedCollectionIds,
          initialTitle: this.lesson.title,
          initialDescription: this.lesson.description,
          submitErrorMessage: this.$tr('submitErrorMessage'),
        };
      },
      previousPageRoute() {
        let route;
        if (this.$route.name === 'LessonEditDetailsPage') {
          // i.e. Lesson Summary
          route = 'SUMMARY';
        } else {
          route = 'ReportsLessonReportPage';
        }
        return this.$router.getRoute(route);
      },
      initialAdHocLearners() {
        return this.$store.state.adHocLearners.user_ids;
      },
      initialSelectedCollectionIds() {
        let collectionIds = [];
        // Only include the AdHocGroup in this if it has already
        // had learners assigned to it.
        this.lesson.lesson_assignments.forEach(assignment => {
          if (assignment.collection_kind === CollectionKinds.ADHOCLEARNERSGROUP) {
            if (this.hasAdHocLearnersAssigned) {
              collectionIds.push(assignment.collection);
            }
          } else {
            collectionIds.push(assignment.collection);
          }
        });
        return collectionIds;
      },
    },
    beforeRouteEnter(to, from, next) {
      return LessonResource.fetchModel({
        id: to.params.lessonId,
      })
        .then(lesson => {
          next(vm => {
            const collection = lesson.lesson_assignments.find(
              a => a.collection_kind === CollectionKinds.ADHOCLEARNERSGROUP
            );

            if (collection) {
              vm.$store
                .dispatch('adHocLearners/initializeAdHocLearnersGroup', collection.collection)
                .then(() => vm.setData(lesson));
            } else {
              // There is no 'ad hoc learners group' for this lesson, so we make one.
              vm.$store
                .dispatch('adHocLearners/createAdHocLearnersGroup', {
                  classId: vm.$route.params.classId,
                })
                .then(() => {
                  LessonResource.saveModel({
                    id: vm.$route.params.lessonId,
                    data: {
                      lesson_assignments: [
                        ...lesson.lesson_assignments,
                        { collection: vm.$store.state.adHocLearners.id },
                      ],
                    },
                  }).then(() => vm.setData(lesson));
                });
            }
          });
        })
        .catch(error => {
          next(vm => vm.setError(error));
        });
    },
    methods: {
      // @public
      setData(data) {
        this.lesson = data;
        this.updatedResources = [...data.resources];
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      // @public
      setError(error) {
        this.$store.dispatch('handleApiError', error);
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      goBackToSummaryPage() {
        this.$router.push(this.previousPageRoute);
      },
      saveLessonModel(data) {
        if (isEmpty(data)) {
          return Promise.resolve();
        } else {
          return LessonResource.saveModel({ id: this.$route.params.lessonId, data });
        }
      },
      handleSaveChanges(newDetails) {
        this.disabled = true;
        const data = {};

        if (newDetails) {
          Object.assign(data, {
            description: newDetails.description,
            lesson_assignments: newDetails.assignments,
            title: newDetails.title,
          });
        }

        if (this.showResourcesTable && !isEqual(this.lesson.resources, this.updatedResources)) {
          Object.assign(data, {
            resources: this.updatedResources,
          });
        }

        return this.saveLessonModel(data)
          .then(this.goBackToSummaryPage)
          .catch(() => {
            this.disabled = false;
            this.$store.dispatch('createSnackbar', this.$tr('submitErrorMessage'));
          });
      },
    },
    $trs: {
      pageTitle: `Edit lesson details for '{title}'`,
      appBarTitle: 'Edit lesson details',
      submitErrorMessage: 'There was a problem saving your changes',
    },
  };

</script>


<style lang="scss" scoped>

  // To match the size of the <legend>s in the form
  .resource-header {
    font-size: 18px;
  }

</style>
