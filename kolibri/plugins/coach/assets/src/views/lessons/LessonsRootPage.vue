<template>

  <div>
    <h1>{{ $tr('classLessons', { className }) }}</h1>
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

    <core-table>
      <table>
        <thead>
          <tr>
            <th class="icon-col"></th>
            <th>{{ $tr('title') }}</th>
            <th>{{ $tr('size') }}</th>
            <th>{{ $tr('visibleTo') }}</th>
            <th>{{ $tr('status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="lesson in filteredLessons"
            :key="lesson.id"
          >
            <td class="icon-col">
              <content-icon
                :kind="lessonKind"
                class="lesson-icon"
              />
            </td>
            <td class="main-col">
              <router-link :to="generateLessonLink(lesson.id)">
                {{ lesson.name }}
              </router-link>
            </td>
            <td>{{ $tr('numberOfResources', { count: lesson.resources.length }) }}</td>
            <td>{{ getLessonVisibility(lesson.assigned_groups) }}</td>
            <td>
              <status-icon :active="lesson.is_active" />
            </td>
          </tr>
        </tbody>
      </table>
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
  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import { LessonsPageNames } from '../../lessonsConstants';
  import StatusIcon from './StatusIcon';
  import CoreTable from './CoreTable'

  export default {
    name: 'LessonsRootPage',
    components: {
      kButton,
      kSelect,
      CreateLessonModal,
      contentIcon,
      StatusIcon,
      CoreTable,
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
        switch(this.filterSelection.value) {
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
        if (numOfAssignments === 1 && assignedGroups[0].collection_kind ===
        CollectionKinds.CLASSROOM) {
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
      status: 'Status',
      numberOfResources: '{count, number, integer} {count, plural, one {resource} other {resources}}',
      noLessons: 'No lessons',
      noActiveLessons: 'No active lessons',
      noInactiveLessons: 'No inactive lessons'
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .lesson-icon
    font-size: 24px
    display: inline-block
    height: 24px
    >>>.ui-icon
      vertical-align: inherit

</style>
