<template>

  <div>
    <h1>{{ $tr('classLessons') }}</h1>
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
      <tr v-for="lesson in lessons" :key="lesson.id">
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
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import { LessonsPageNames } from '../../lessonsConstants';

  export default {
    name: 'LessonsRootPage',
    components: {
      kButton,
      CreateLessonModal,
      contentIcon,
    },
    data() {
      return {
        showModal: false,
        lessonKind: ContentNodeKinds.LESSON,
      };
    },
    methods: {
      generateLessonLink(lessonId) {
        return {
          name: LessonsPageNames.SUMMARY,
          params: {
            lessonId,
          }
        };
      },
      getLessonVisibility(assignedGroups) {
         const numOfAssignments = assignedGroups.length;
        if (numOfAssignments > 1 &&
          assignedGroups[0].collection_kind === CollectionKinds.CLASSROOM) {
          return this.$tr('numberOfGroups', { count: numOfAssignments });
        }
        return this.$tr('entireClass');
      },
    },
    vuex: {
      getters: {
        lessons: state => state.pageState.lessons,
      },
    },
    $trs: {
      classLessons: '[class name] lessons',
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
