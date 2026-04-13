<template>

  <LearnAppBarPage
    :appBarTitle="learnString('learnLabel')"
    :loading="pageLoading"
  >
    <KCircularLoader v-if="pageLoading" />
    <div
      v-else
      role="main"
    >
      <KBreadcrumbs
        :items="breadcrumbs"
        :ariaLabel="learnString('classesAndAssignmentsLabel')"
      />
      <h1 class="classroom-name">
        <KLabeledIcon
          icon="classes"
          :label="className"
        />
      </h1>
      <AssignedCoursesCards :courses="activeCourses" />
      <AssignedLessonsCards
        :lessons="activeLessons"
        :style="{ marginTop: '44px' }"
      />
      <AssignedQuizzesCards
        :quizzes="activeQuizzes"
        :style="{ marginTop: '44px' }"
      />
    </div>
  </LearnAppBarPage>

</template>


<script>

  import { computed, onBeforeUnmount } from 'vue';
  import { useTimeoutPoll } from '@vueuse/core';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import { PageNames, ClassesPageNames } from '../../constants';

  import useLearnerResources from '../../composables/useLearnerResources';
  import commonLearnStrings from '../commonLearnStrings';
  import LearnAppBarPage from '../LearnAppBarPage';
  import AssignedCoursesCards from './AssignedCoursesCards';
  import AssignedQuizzesCards from './AssignedQuizzesCards';
  import AssignedLessonsCards from './AssignedLessonsCards';

  export default {
    name: 'ClassAssignmentsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AssignedCoursesCards,
      AssignedQuizzesCards,
      AssignedLessonsCards,
      KBreadcrumbs,
      LearnAppBarPage,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup(props) {
      const {
        fetchClass,
        getClass,
        getClassActiveCourses,
        getClassActiveLessons,
        getClassActiveQuizzes,
      } = useLearnerResources();

      const classId = computed(() => props.classId);
      const classroom = computed(() => getClass(classId.value));
      const className = computed(() => (classroom.value ? classroom.value.name : ''));
      const activeCourses = computed(() => getClassActiveCourses(classId.value));
      const activeLessons = computed(() => getClassActiveLessons(classId.value));
      const activeQuizzes = computed(() => getClassActiveQuizzes(classId.value));

      const polling = useTimeoutPoll(
        () => fetchClass({ classId: classId.value, force: true }),
        30000,
      );
      polling.resume();

      onBeforeUnmount(polling.pause);

      return {
        className,
        activeCourses,
        activeLessons,
        activeQuizzes,
        pageLoading,
      };
    },
    props: {
      classId: {
        type: String,
        required: true,
      },
    },
    computed: {
      breadcrumbs() {
        return [
          {
            text: this.coreString('homeLabel'),
            link: { name: PageNames.HOME },
          },
          {
            text: this.coreString('classesLabel'),
            link: { name: ClassesPageNames.ALL_CLASSES },
          },
          {
            text: this.className,
            link: { name: ClassesPageNames.CLASS_ASSIGNMENTS },
          },
        ];
      },
    },
    $trs: {
      documentTitle: {
        message: 'Class assignments',
        context:
          'Page/tab title displayed for the Learn page when the learner is enrolled in a class. This is where the learners can see the list of lessons and quizzes coaches have opened and made available for them.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .classroom-name {
    margin-bottom: 32px;
  }

</style>
