<template>

  <div>
    <h1>{{ $tr('classLessons') }}</h1>
    <div class="filter-and-button">
      <k-select
        :label="$tr('show')"
        :options="filterOptions"
        :inline="true"
        v-model="filterSelection"
      />
      <k-button
        :primary="true"
        :text="$tr('newLesson')"
        @click="showModal=true"
      />
    </div>

    <core-table>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('title') }}</th>
          <th>{{ $tr('size') }}</th>
          <th>{{ $tr('recipients') }}</th>
          <th>
            {{ $tr('status') }}
            <core-info-icon
              :iconAriaLabel="$tr('lessonStatusDescription')"
              :tooltipText="$tr('statusTooltipText')"
              tooltipPosition="bottom right"
            />
          </th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr
          v-for="lesson in lessons"
          v-show="showLesson(lesson)"
          :key="lesson.id"
        >
          <td class="core-table-icon-col">
            <content-icon :kind="lessonKind" />
          </td>
          <td class="core-table-main-col lesson-title-col">
            <k-router-link
              :to="lessonSummaryLink({ lessonId: lesson.id, classId })"
              :text="lesson.title"
            />
          </td>
          <td>{{ $tr('numberOfResources', { count: lesson.resources.length }) }}</td>
          <td>{{ getLessonVisibility(lesson.lesson_assignments) }}</td>
          <td>
            <status-icon :active="lesson.is_active" />
          </td>
        </tr>
      </tbody>
    </core-table>

    <p v-if="!lessons.length">
      {{ $tr('noLessons') }}
    </p>
    <p v-else-if="!activeLessonCounts.true && filterSelection.value === 'activeLessons'">
      {{ $tr('noActiveLessons') }}
    </p>
    <p v-else-if="!activeLessonCounts.false && filterSelection.value === 'inactiveLessons'">
      {{ $tr('noInactiveLessons') }}
    </p>

    <assignment-details-modal
      v-if="showModal"
      :modalTitle="$tr('newLesson')"
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
      ref="detailsModal"
    />
  </div>

</template>


<script>

  import countBy from 'lodash/countBy';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import StatusIcon from '../assignments/StatusIcon';
  import { createLesson } from '../../state/actions/lessons';
  import AssignmentDetailsModal from '../assignments/AssignmentDetailsModal';
  import { lessonSummaryLink } from './lessonsRouterUtils';

  export default {
    name: 'lessonsRootPage',
    components: {
      coreTable,
      CoreInfoIcon,
      StatusIcon,
      contentIcon,
      kButton,
      kRouterLink,
      kSelect,
      AssignmentDetailsModal,
    },
    data() {
      return {
        showModal: false,
        lessonKind: ContentNodeKinds.LESSON,
        filterSelection: {},
      };
    },
    computed: {
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
        this.createLesson(this.classId, {
          ...payload,
          lesson_assignments: payload.assignments,
        })
          .then()
          .catch(() => this.$refs.detailsModal.handleSubmitFailure());
      },
    },
    vuex: {
      actions: {
        createLesson,
      },
      getters: {
        lessons: state => state.pageState.lessons,
        classId: state => state.classId,
        learnerGroups: state => state.pageState.learnerGroups,
      },
    },
    $trs: {
      classLessons: 'Lessons',
      show: 'Show',
      allLessons: 'All lessons',
      activeLessons: 'Active lessons',
      inactiveLessons: 'Inactive lessons',
      newLesson: 'New lesson',
      title: 'Title',
      size: 'Size',
      recipients: 'Recipients',
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


<style lang="stylus" scoped>

  .lesson-title-col
    width: 40%

  .filter-and-button
    display: flex
    flex-wrap: wrap-reverse
    justify-content: space-between
    button
      align-self: flex-end

</style>
