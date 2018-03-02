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
          <th>{{ $tr('visibleTo') }}</th>
          <th>
            {{ $tr('status') }}
            <info-icon
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

    <lesson-details-modal
      v-if="showModal"
      @cancel="showModal=false"
    />
  </div>

</template>


<script>

  import countBy from 'lodash/countBy';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import LessonDetailsModal from './ManageLessonModals/LessonDetailsModal';
  import InfoIcon from './InfoIcon';
  import StatusIcon from './StatusIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import { lessonSummaryLink } from './lessonsRouterUtils';

  export default {
    name: 'lessonsRootPage',
    components: {
      CoreTable,
      LessonDetailsModal,
      InfoIcon,
      StatusIcon,
      contentIcon,
      kButton,
      kRouterLink,
      kSelect,
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
    },
    vuex: {
      getters: {
        lessons: state => state.pageState.lessons,
        className: state => state.className,
        classId: state => state.classId,
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
      visibleTo: 'Visible to',
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
