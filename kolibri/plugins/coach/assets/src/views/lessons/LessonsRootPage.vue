<template>

  <div>
    <h1>{{ $tr('classLessons') }}</h1>
    <k-select
      :label="$tr('viewBy')"
      :options="filterOptions"
      :inline="true"
      v-model="filterSelection"
    />
    <k-button
      :primary="true"
      :text="$tr('newLesson')"
      @click="showModal=true"
    />
    <table class="lessons-list">
      <tr>
        <th></th>
        <th>{{ $tr('title') }}</th>
        <th>{{ $tr('size') }}</th>
        <th>{{ $tr('visibleTo') }}</th>
        <th>{{ $tr('status') }}</th>
      </tr>
      <tr v-for="lesson in filteredLessons" :key="lesson.id">
        <td>
          <content-icon :kind="lessonKind" />
        </td>
        <td>
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
    </table>
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

  export default {
    name: 'LessonsRootPage',
    components: {
      kButton,
      kSelect,
      CreateLessonModal,
      contentIcon,
      StatusIcon,
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
      },
    },
    $trs: {
      classLessons: '[class name] lessons',
      viewBy: 'View by',
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
    },
  };

</script>


<style lang="stylus" scoped></style>
