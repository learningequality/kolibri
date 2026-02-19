<template>

  <SidePanelLayout
    :goBack="goBack"
    :title="selectedLearnersLabel$()"
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
      </div>
    </template>
  </SidePanelLayout>

</template>


<script>

  import { useRoute, useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';

  export default {
    name: 'PreviewLearnersSubpage',
    components: {
      SidePanelLayout,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();

      const { backAction$ } = coreStrings;
      const { selectedLearnersLabel$, courseNameLabel$ } = coursesStrings;

      const goBack = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
          }),
        );
      };

      return {
        goBack,

        backAction$,
        courseNameLabel$,
        selectedLearnersLabel$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .bottom-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    width: 100%;
  }

</style>
