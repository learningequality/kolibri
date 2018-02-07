<template>

  <div>
    <h1>{{ $tr('classLessons', { className }) }}</h1>
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
          v-for="lesson in filteredLessons"
          :key="lesson.id"
        >
          <td class="core-table-icon-col">
            <content-icon :kind="lessonKind" />
          </td>
          <td class="core-table-main-col">
            <k-router-link
              :to="generateLessonLink(lesson.id)"
              :text="lesson.name"
            />
          </td>
          <td>{{ $tr('numberOfResources', { count: lesson.resources.length }) }}</td>
          <td>{{ getLessonVisibility(lesson.assigned_groups) }}</td>
          <td>
            <status-icon :active="lesson.is_active" />
          </td>
        </tr>
      </tbody>
    </core-table>

    <p v-if="!lessons.length">
      {{ $tr('noLessons') }}
    </p>
    <p v-else-if="!filteredLessons.length && filterSelection.value === $tr('activeLessons')">
      {{ $tr('noActiveLessons') }}

    </p>
    <p v-else-if="!filteredLessons.length && filterSelection.value === $tr('inactiveLessons')">
      {{ $tr('noInactiveLessons') }}
    </p>

    <create-lesson-modal
      v-if="showModal"
      @cancel="showModal=false"
    />
  </div>

</template>


<script>

  import CreateLessonModal from './CreateLessonModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import { LessonsPageNames } from '../../lessonsConstants';
  import StatusIcon from './StatusIcon';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import InfoIcon from './InfoIcon';

  export default {
    name: 'LessonsRootPage',
    components: {
      kButton,
      kSelect,
      CreateLessonModal,
      contentIcon,
      kRouterLink,
      StatusIcon,
      CoreTable,
      InfoIcon,
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
        return [
          {
            label: this.$tr('allLessons'),
            value: this.$tr('allLessons'),
          },
          {
            label: this.$tr('activeLessons'),
            value: this.$tr('activeLessons'),
          },

          {
            label: this.$tr('inactiveLessons'),
            value: this.$tr('inactiveLessons'),
          },
        ];
      },
      filteredLessons() {
        switch (this.filterSelection.value) {
          case this.$tr('activeLessons'):
            return this.lessons.filter(lesson => lesson.is_active);
          case this.$tr('inactiveLessons'):
            return this.lessons.filter(lesson => !lesson.is_active);
          default:
            return this.lessons;
        }
      },
    },
    beforeMount() {
      this.filterSelection = this.filterOptions[0];
    },
    methods: {
      generateLessonLink(lessonId) {
        return {
          name: LessonsPageNames.SUMMARY,
          params: {
            lessonId,
          },
        };
      },
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
      },
    },
    $trs: {
      classLessons: '{ className } lessons',
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
      noLessons: 'No lessons',
      noActiveLessons: 'No active lessons',
      noInactiveLessons: 'No inactive lessons',
      lessonStatusDescription: 'Lesson status description',
      statusTooltipText: 'Active: learners can see lesson. Inactive: hidden from learners.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .filter-and-button
    display: flex
    flex-wrap: wrap-reverse
    justify-content: space-between
    button
      align-self: flex-end

</style>
