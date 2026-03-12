<template>

  <div v-if="courses && courses.length > 0">
    <h2>
      <KLabeledIcon
        icon="course"
        :label="header"
      />
    </h2>

    <KCardGrid
      layout="1-2-3"
      :layoutOverride="[{ columnGap: '16px', rowGap: '16px' }]"
    >
      <AssignmentCard
        v-for="course in courses"
        :key="course.id"
        :course="course"
        :to="getClassCourseLink(course)"
        :collectionTitle="displayClassName ? getCourseClassName(course) : ''"
      />
    </KCardGrid>
  </div>

</template>


<script>

  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import useLearnerResources from '../../composables/useLearnerResources';
  import AssignmentCard from '../cards/AssignmentCard';

  export default {
    name: 'AssignedCoursesCards',
    components: {
      AssignmentCard,
    },
    setup() {
      const { getClass, getClassCourseLink } = useLearnerResources();
      const { recentCoursesHeader$, yourCoursesHeader$ } = coursesStrings;

      function getCourseClassName(course) {
        const courseClass = getClass(course.collection);
        return courseClass ? courseClass.name : '';
      }

      return {
        getCourseClassName,
        getClassCourseLink,
        recentCoursesHeader$,
        yourCoursesHeader$,
      };
    },
    props: {
      courses: {
        type: Array,
        required: true,
      },
      /**
       * If `true` 'Recent courses' header will be displayed.
       * Otherwise 'My courses' will be displayed.
       */
      recent: {
        type: Boolean,
        default: false,
      },
      /**
       * A course's class name will be displayed above
       * the course title if `true`
       */
      displayClassName: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      header() {
        return this.recent ? this.recentCoursesHeader$() : this.yourCoursesHeader$();
      },
    },
  };

</script>


<style lang="scss" scoped></style>
