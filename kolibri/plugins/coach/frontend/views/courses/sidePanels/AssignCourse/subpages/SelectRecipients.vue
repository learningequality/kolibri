<template>

  <SidePanelLayout
    :goBack="goBack"
    :title="selectRecipientsLabel$()"
    :subtitle="courseNameLabel$({ name: 'Course with a name that is super long, test overflow' })"
  >
    <!-- TODO: Replace with actual course details content -->
    <template #default>
      <!-- Content for selecting a course to assign can go here -->
    </template>
    <template #bottomNavigation>
      <div>
        <!-- Placeholder for selected learners count -->
      </div>
      <div class="bottom-actions">
        <KButton
          :text="backAction$()"
          @click="goBack"
        />
        <KButton
          primary
          :text="assignCourseAction$()"
        />
      </div>
    </template>
  </SidePanelLayout>

</template>


<script>

  import { useRoute, useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { coachStrings } from '../../../../common/commonCoachStrings';
  import SidePanelLayout from '../../../../common/sidePanel/SidePanelLayout.vue';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';

  export default {
    name: 'SelectRecipientsSubpage',
    components: {
      SidePanelLayout,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();

      const { backAction$ } = coreStrings;
      const { courseNameLabel$, assignCourseAction$, selectRecipientsLabel$ } = coachStrings;

      const goBack = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_INDEX,
          }),
        );
      };

      return {
        goBack,

        backAction$,
        courseNameLabel$,
        assignCourseAction$,
        selectRecipientsLabel$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .bottom-actions {
    display: flex;
    gap: 12px;
  }

</style>
