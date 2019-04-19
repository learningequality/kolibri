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
          :label="$tr('show')"
          :options="filterOptions"
          :inline="true"
        />
        <KButton
          :primary="true"
          :text="$tr('newLesson')"
          @click="showModal=true"
        />
      </div>

      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ $tr('title') }}</th>
            <th>{{ $tr('size') }}</th>
            <th>{{ $tr('assignedGroupsHeader') }}</th>
            <th>
              {{ $tr('status') }}
              <CoreInfoIcon
                :iconAriaLabel="$tr('lessonStatusDescription')"
                :tooltipText="$tr('statusTooltipText')"
                tooltipPlacement="bottom"
              />
            </th>
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
            <td>{{ $tr('numberOfResources', { count: lesson.resources.length }) }}</td>
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

      <AssignmentDetailsModal
        v-if="showModal"
        ref="detailsModal"
        :modalTitle="$tr('newLessonModalTitle')"
        :modalTitleErrorMessage="lessonDetailEditorStrings.$tr('duplicateTitle')"
        :submitErrorMessage="$tr('saveLessonError')"
        :initialDescription="''"
        :showDescriptionField="true"
        :isInEditMode="false"
        :initialTitle="''"
        :initialSelectedCollectionIds="[classId]"
        :classId="classId"
        :groups="learnerGroups"
        @continue="handleDetailsModalContinue"
        @cancel="showModal=false"
      />
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import countBy from 'lodash/countBy';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import {
    ContentNodeKinds,
    CollectionKinds,
    ERROR_CONSTANTS,
  } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import LessonActive from '../../common/LessonActive';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import AssignmentDetailsModal from '../../plan/assignments/AssignmentDetailsModal';
  import { lessonSummaryLink } from '../../../routes/planLessonsRouterUtils';
  import LessonDetailEditor from '../../common/LessonDetailEditor';

  const lessonDetailEditorStrings = crossComponentTranslator(LessonDetailEditor);

  export default {
    name: 'LessonsRootPage',
    metaInfo() {
      return {
        title: this.$tr('classLessons'),
      };
    },
    components: {
      PlanHeader,
      CoreTable,
      CoreInfoIcon,
      KButton,
      KRouterLink,
      KSelect,
      KLabeledIcon,
      KIcon,
      LessonActive,
      AssignmentDetailsModal,
    },
    mixins: [commonCoach],
    data() {
      return {
        showModal: false,
        lessonKind: ContentNodeKinds.LESSON,
        filterSelection: {},
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
      lessonDetailEditorStrings() {
        return lessonDetailEditorStrings;
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
          return this.$tr('entireClass');
        }
        return this.$tr('numberOfGroups', { count: numOfAssignments });
      },
      handleDetailsModalContinue(payload) {
        this.createLesson({
          classId: this.classId,
          payload: {
            ...payload,
            lesson_assignments: payload.assignments,
          },
        })
          .then()
          .catch(error => {
            const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (errors) {
              this.$refs.detailsModal.handleSubmitTitleFailure();
            } else {
              this.$refs.detailsModal.handleSubmitFailure();
            }
          });
      },
    },
    $trs: {
      classLessons: 'Lessons',
      show: 'Show',
      allLessons: 'All lessons',
      activeLessons: 'Active lessons',
      inactiveLessons: 'Inactive lessons',
      newLesson: 'New lesson',
      newLessonModalTitle: 'Create new lesson',
      title: 'Title',
      size: 'Size',
      assignedGroupsHeader: 'Visible to',
      entireClass: 'Entire class',
      numberOfGroups: '{count, number, integer} {count, plural, one {group} other {groups}}',
      noOne: 'No one',
      status: 'Status',
      numberOfResources:
        '{count, number, integer} {count, plural, one {resource} other {resources}}',
      noLessons: 'You do not have any lessons',
      noActiveLessons: 'No active lessons',
      noInactiveLessons: 'No inactive lessons',
      lessonStatusDescription: 'Lesson status description',
      statusTooltipText: 'Learners can only see active lessons',
      saveLessonError: 'There was a problem saving this lesson',
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
