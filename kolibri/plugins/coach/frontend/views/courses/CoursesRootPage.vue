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
    <!--
      Router view for side panels implemented in courses/sidePanels/...
      whose routes are defined in coach/frontend/routes/coursesRoutes.js
      Side panels will only be rendered when their route is active.
    -->
    <router-view />
  </CoachAppBarPage>

</template>


<script>

  import store from 'kolibri/store';
  import { useRoute } from 'vue-router/composables';
  import { computed } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import { overrideRoute } from '../../utils';

  export default {
    name: 'CoursesRootPage',
    components: {
      CoachHeader,
      CoachAppBarPage,
    },
    setup() {
      const route = useRoute();
      const { coursesLabel$, assignCourseAction$ } = coursesStrings;

      // Temporarily adding it here, it should be moved to a place after
      // data is loaded.
      store.dispatch('notLoading');

      const assignCourseRoute = computed(() =>
        overrideRoute(route, {
          name: PageNames.COURSES_ASSIGN,
        }),
      );
      return {
        assignCourseRoute,

        coursesLabel$,
        assignCourseAction$,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
