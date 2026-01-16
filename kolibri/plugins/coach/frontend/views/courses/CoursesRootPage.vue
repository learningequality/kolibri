<template>

  <CoachAppBarPage showSubNav>
    <KPageContainer>
      <CoachHeader :title="coursesLabel$()">
        <template #actions>
          <KRouterLink
            primary
            appearance="raised-button"
            :text="assignCourseAction$()"
            :to="assignCourseRoute"
          />
        </template>
      </CoachHeader>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import { coachStrings } from '../common/commonCoachStrings';

  export default {
    name: 'CoursesRootPage',
    components: {
      CoachHeader,
      CoachAppBarPage,
    },
    setup() {
      const { coursesLabel$, assignCourseAction$ } = coachStrings;

      const assignCourseRoute = {
        name: PageNames.COURSES_ROOT,
      };
      return {
        assignCourseRoute,

        coursesLabel$,
        assignCourseAction$,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
