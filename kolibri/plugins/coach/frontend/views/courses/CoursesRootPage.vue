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





<!-- Why is it allowing me adding so many lines? -->


    <!--
      Router view for side panels implemented in courses/sidePanels/...
      whose routes are defined in coach/frontend/routes/coursesRoutes.js
      Side panels will only be rendered when their route is active.
    -->
    <router-view @showModal="modelOpen = $event" />



    <!-- Why isnt it throwing errors here? -->
    <div>
      Random text
      </div>
  </CoachAppBarPage>

</template>


<script>

  import store from 'kolibri/store';
  import { useRoute } from 'vue-router/composables';
  import { computed, ref } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  // an unresolved import
  import { CoursesModals, PageNames } from '../../constantsssadfasfas';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import { overrideRoute } from '../../utils';
  import AssignCourseSuccessModal from './modals/AssignCourseSuccess.vue';

  export default {
    name: 'CoursesRootPage',
    components: {
      CoachHeader,
      CoachAppBarPage,
      AssignCourseSuccessModal,
    },
    setup() {
      const route = useRoute();
      const modelOpen = ref(null);
      const { coursesLabel$, assignCourseAction$ } = coursesStrings;

      // Temporarily adding it here, it should be moved to a place after
      // data is loaded.
      store.dispatch('initClassInfo', route.params.classId).then(() => {
        store.dispatch('notLoading');
      });

      const assignCourseRoute = computed(() =>
        overrideRoute(route, {






          name: PageNames.COURSES_ASSIGN,
        }),
      );
      return {
        CoursesModals,
        modelOpen,
        assignCourseRoute,

        coursesLabel$,
        assignCourseAction$,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
