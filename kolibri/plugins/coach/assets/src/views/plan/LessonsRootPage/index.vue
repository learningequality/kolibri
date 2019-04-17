<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <PlanHeader />

      <div class="filter-and-button">
        <KSelect
          v-model="filterSelection"
          :label="coachStrings.$tr('showAction')"
          :options="filterOptions"
          :inline="true"
        />
        <KButton
          :primary="true"
          :text="coachStrings.$tr('newLessonAction')"
          @click="showModal=true"
        />
      </div>

      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('titleLabel') }}</th>
            <th>{{ $tr('size') }}</th>
            <th>{{ coachStrings.$tr('recipientsLabel') }}</th>
            <th>{{ coachStrings.$tr('statusLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr
            v-for="lesson in lessons"
            v-show="showLesson(lesson)"
            :key="lesson.id"
          >
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" lesson />
                <KRouterLink
                  :to="lessonSummaryLink({ lessonId: lesson.id, classId })"
                  :text="lesson.title"
                />
              </KLabeledIcon>
            </td>
            <td>{{ coachStrings.$tr('numberOfResources', { value: lesson.resources.length }) }}</td>
            <td>{{ getLessonVisibility(lesson.lesson_assignments) }}</td>
            <td>
              <LessonActive :active="lesson.is_active" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>

      <p v-if="!lessons.length">
        {{ $tr('noLessons') }}
      </p>
      <p v-else-if="!activeLessonCounts.true && filterSelection.value === 'activeLessons'">
        {{ $tr('noActiveLessons') }}
      </p>
      <p v-else-if="!activeLessonCounts.false && filterSelection.value === 'inactiveLessons'">
        {{ $tr('noInactiveLessons') }}
      </p>

      <KModal
        v-if="showModal"
        :title="$tr('newLessonModalTitle')"
        :submitText="coachStrings.$tr('continueAction')"
        :cancelText="coachStrings.$tr('cancelAction')"
        :submitDisabled="detailsModalIsDisabled"
        :cancelDisabled="detailsModalIsDisabled"
        @cancel="showModal=false"
        @submit="$refs.detailsModal.submitData()"
      >
        <AssignmentDetailsModal
          ref="detailsModal"
          assignmentType="new_lesson"
          :modalTitleErrorMessage="$tr('duplicateTitle')"
          :submitErrorMessage="$tr('saveLessonError')"
          :initialDescription="''"
          :initialTitle="''"
          :initialSelectedCollectionIds="[classId]"
          :classId="classId"
          :groups="learnerGroups"
          :disabled="detailsModalIsDisabled"
          :onlyShowForm="true"
          @submit="handleDetailsModalContinue"
          @cancel="showModal=false"
        />
      </KModal>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import countBy from 'lodash/countBy';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import KModal from 'kolibri.coreVue.components.KModal';
  import { CollectionKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import LessonActive from '../../common/LessonActive';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import AssignmentDetailsModal from '../../plan/assignments/AssignmentDetailsModal';
  import { lessonSummaryLink } from '../../../routes/planLessonsRouterUtils';

  export default {
    name: 'LessonsRootPage',
    components: {
      PlanHeader,
      CoreTable,
      KButton,
      KRouterLink,
      KSelect,
      KLabeledIcon,
      KIcon,
      KModal,
      LessonActive,
      AssignmentDetailsModal,
    },
    mixins: [commonCoach],
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
      filterOptions() {
        const filters = ['allLessons', 'activeLessons', 'inactiveLessons'];
        return filters.map(filter => ({
          label: this.$tr(filter),
          value: filter,
        }));
      },
      activeLessonCounts() {
        return countBy(this.lessons, 'is_active');
      },
    },
    beforeMount() {
      this.filterSelection = this.filterOptions[0];
    },
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
      getLessonVisibility(assignedGroups) {
        const numOfAssignments = assignedGroups.length;
        if (numOfAssignments === 0) {
          return this.$tr('noOne');
        } else if (
          numOfAssignments === 1 &&
          assignedGroups[0].collection_kind === CollectionKinds.CLASSROOM
        ) {
          return this.coachStrings.$tr('entireClassLabel');
        }
        return this.coachStrings.$tr('numberOfGroups', { value: numOfAssignments });
      },
      handleDetailsModalContinue(payload) {
        this.detailsModalIsDisabled = true;
        this.createLesson({
          classId: this.classId,
          payload: {
            ...payload,
            lesson_assignments: payload.assignments,
          },
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
    },
    $trs: {
      allLessons: 'All lessons',
      activeLessons: 'Active lessons',
      inactiveLessons: 'Inactive lessons',
      newLessonModalTitle: 'Create new lesson',
      size: 'Size',
      noOne: 'No one',
      noLessons: 'You do not have any lessons',
      noActiveLessons: 'No active lessons',
      noInactiveLessons: 'No inactive lessons',
      saveLessonError: 'There was a problem saving this lesson',
      duplicateTitle: 'A lesson with that name already exists',
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
