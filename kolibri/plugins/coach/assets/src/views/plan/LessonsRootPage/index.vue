<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <template #sub-nav>
      <TopNavbar />
    </template>

    <KPageContainer>
      <PlanHeader />

      <div class="filter-and-button">
        <!-- Hidden temporarily per https://github.com/learningequality/kolibri/issues/6174
          <KSelect
            v-model="filterSelection"
            :label="coreString('showAction')"
            :options="filterOptions"
            :inline="true"
          />
          -->
        <!-- Remove this div - it makes sure the [NEW LESSON] button stays right-aligned
              while the above <KSelect> is hidden
          -->
        <div style="display: inline;"></div>
        <KRouterLink
          :primary="true"
          appearance="raised-button"
          :text="coachString('newLessonAction')"
          :to="newLessonRoute"
        />
      </div>

      <CoreTable>
        <template #headers>
          <th>{{ coachString('titleLabel') }}</th>
          <th>{{ $tr('size') }}</th>
          <th>{{ coachString('recipientsLabel') }}</th>
          <th>{{ coachString('lessonVisibleLabel') }}</th>
        </template>
        <template #tbody>
          <transition-group tag="tbody" name="list">
            <tr
              v-for="lesson in sortedLessons"
              v-show="showLesson(lesson)"
              :key="lesson.id"
            >
              <td>
                <KRouterLink
                  :to="lessonSummaryLink({ lessonId: lesson.id, classId })"
                  :text="lesson.title"
                  icon="lesson"
                />
              </td>
              <td>{{ coachString('numberOfResources', { value: lesson.resources.length }) }}</td>
              <td>
                <Recipients
                  :groupNames="getRecipientNamesForLesson(lesson)"
                  :hasAssignments="lesson.lesson_assignments.length > 0 ||
                    lesson.learner_ids.length > 0"
                />
              </td>
              <td>
                <KSwitch
                  name="toggle-lesson-visibility"
                  label=""
                  :checked="lesson.is_active"
                  :value="lesson.is_active"
                  @change="handleToggleVisibility(lesson)"
                />
              </td>
            </tr>
          </transition-group>
        </template>
      </CoreTable>

      <p v-if="!lessons.length">
        {{ $tr('noLessons') }}
      </p>
      <!-- <p v-else-if="!activeLessonCounts.true && filterSelection.value === 'activeLessons'">
        {{ $tr('noActiveLessons') }}
      </p>
      <p v-else-if="!activeLessonCounts.false && filterSelection.value === 'inactiveLessons'">
        {{ $tr('noInactiveLessons') }}
      </p> -->

      <KModal
        v-if="showModal"
        :title="coachString('createLessonAction')"
        :submitText="coreString('continueAction')"
        :cancelText="coreString('cancelAction')"
        :submitDisabled="detailsModalIsDisabled"
        :cancelDisabled="detailsModalIsDisabled"
        @cancel="showModal = false"
        @submit="$refs.detailsModal.submitData()"
      >
        <AssignmentDetailsModal
          ref="detailsModal"
          assignmentType="new_lesson"
          :modalTitleErrorMessage="coachString('duplicateLessonTitleError')"
          :submitErrorMessage="coachString('saveLessonError')"
          :initialDescription="''"
          :initialTitle="''"
          :initialSelectedCollectionIds="[classId]"
          :classId="classId"
          :groups="learnerGroups"
          :disabled="detailsModalIsDisabled"
          @submit="handleDetailsModalContinue"
          @cancel="showModal = false"
        />
      </KModal>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { LessonResource } from 'kolibri.resources';
  //  import countBy from 'lodash/countBy';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import AssignmentDetailsModal from '../../plan/assignments/AssignmentDetailsModal';
  import { lessonSummaryLink } from '../../../routes/planLessonsRouterUtils';

  export default {
    name: 'LessonsRootPage',
    components: {
      PlanHeader,
      CoreTable,
      AssignmentDetailsModal,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        showModal: false,
        filterSelection: {},
        detailsModalIsDisabled: false,
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonsRoot', ['lessons', 'learnerGroups']),
      sortedLessons() {
        return this._.orderBy(this.lessons, ['date_created'], ['desc']);
      },
      // filterOptions() {
      //   const filters = ['allLessons', 'activeLessons', 'inactiveLessons'];
      //   return filters.map(filter => ({
      //     label: this.$tr(filter),
      //     value: filter,
      //   }));
      // },
      // activeLessonCounts() {
      //   return countBy(this.lessons, 'is_active');
      // },
      newLessonRoute() {
        return { name: LessonsPageNames.LESSON_CREATION_ROOT };
      },
    },
    // beforeMount() {
    //   this.filterSelection = this.filterOptions[0];
    // },
    methods: {
      ...mapActions('lessonsRoot', ['createLesson']),
      showLesson(lesson) {
        switch (this.filterSelection.value) {
          case 'activeLessons':
            return lesson.is_active;
          case 'inactiveLessons':
            return !lesson.is_active;
          default:
            return true;
        }
      },
      lessonSummaryLink,
      handleDetailsModalContinue(payload) {
        this.detailsModalIsDisabled = true;
        this.createLesson({
          classId: this.classId,
          payload,
        })
          .then() // If successful, should redirect to LessonSummaryPage
          .catch(error => {
            const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (errors) {
              this.$refs.detailsModal.handleSubmitTitleFailure();
            } else {
              this.$refs.detailsModal.handleSubmitFailure();
            }
            this.detailsModalIsDisabled = false;
          });
      },
      handleToggleVisibility(lesson) {
        const newActiveState = !lesson.is_active;
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');

        let promise = LessonResource.saveModel({
          id: lesson.id,
          data: {
            is_active: newActiveState,
          },
          exists: true,
        });

        return promise.then(() => {
          this.$store.dispatch('lessonsRoot/refreshClassLessons', this.$route.params.classId);
          this.$store.dispatch('createSnackbar', snackbarMessage);
        });
      },
    },
    $trs: {
      // allLessons: {
      //   message: 'All lessons',
      //   context:
      //     'Indicates a link that takes the user back to the
      //main list of lessons from an individual lesson.',
      // },
      // activeLessons: 'Active lessons',
      // inactiveLessons: 'Inactive lessons',
      size: {
        message: 'Size',
        context:
          "'Size' is a column name in the 'Lessons' section. It refers to the number or learning resources there are in a specific lesson.",
      },
      noLessons: {
        message: 'You do not have any lessons',
        context:
          "Text displayed in the 'Lessons' tab of the 'Plan' section if there are no lessons created",
      },
      // noActiveLessons: 'No active lessons',
      // noInactiveLessons: 'No inactive lessons',
    },
  };

</script>


<style lang="scss" scoped>

  .filter-and-button {
    display: flex;
    flex-wrap: wrap-reverse;
    justify-content: space-between;
    button {
      align-self: flex-end;
    }
  }

</style>
