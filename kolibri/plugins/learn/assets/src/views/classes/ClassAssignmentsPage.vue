<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <KCircularLoader v-if="loading" />
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

      <AssignedLessonsCards :lessons="activeLessons" />
      <AssignedQuizzesCards
        :quizzes="activeQuizzes"
        :style="{ marginTop: '44px' }"
      />
    </div>
  </LearnAppBarPage>

</template>


<script>

  import { computed, onBeforeMount, onBeforeUnmount } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  import { PageNames, ClassesPageNames } from '../../constants';

  import useLearnerResources from '../../composables/useLearnerResources';
  import commonLearnStrings from './../commonLearnStrings';
  import LearnAppBarPage from './../LearnAppBarPage';
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
      AssignedQuizzesCards,
      AssignedLessonsCards,
      KBreadcrumbs,
      LearnAppBarPage,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup(_, { root }) {
      const { fetchClass, getClass, getClassActiveLessons, getClassActiveQuizzes } =
        useLearnerResources();

      const classId = root.$router.currentRoute.params.classId;
      const classroom = computed(() => getClass(classId));
      const className = computed(() => (get(classroom) ? get(classroom).name : ''));
      const activeLessons = computed(() => getClassActiveLessons(get(classId)));
      const activeQuizzes = computed(() => getClassActiveQuizzes(get(classId)));

      let pollTimeoutId;

      function schedulePoll() {
        pollTimeoutId = setTimeout(pollForUpdates, 30000);
      }

      function pollForUpdates() {
        fetchClass({ classId, force: true }).then(() => {
          schedulePoll();
        });
      }

      onBeforeMount(() => {
        pollForUpdates();
      });

      onBeforeUnmount(() => {
        clearTimeout(pollTimeoutId);
      });

      return {
        className,
        activeLessons,
        activeQuizzes,
      };
    },
    props: {
      loading: {
        type: Boolean,
        default: false,
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
