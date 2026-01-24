<template>

  <SidePanelLayout
    :goBack="goBack"
    :title="courseNameLabel$({ name: 'Course Name' })"
    :subtitle="'5 units • 29 resources • 67h 23m total length'"
  >
    <!-- TODO: Replace with actual course details content -->
    <template #default>
      <!-- Content for selecting a course to assign can go here -->
    </template>
    <template #bottomNavigation>
      <div class="bottom-actions">
        <KButton
          :text="backAction$()"
          @click="goBack"
        />
        <KButton
          primary
          :text="selectRecipientsLabel$()"
          @click="selectRecipients"
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
    name: 'CourseDetailsSubpage',
    components: {
      SidePanelLayout,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();

      const { backAction$ } = coreStrings;
      const { courseNameLabel$, selectRecipientsLabel$ } = coursesStrings;

      const selectRecipients = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
          }),
        );
      };

      const goBack = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_INDEX,
          }),
        );
      };

      return {
        goBack,
        selectRecipients,

        backAction$,
        courseNameLabel$,
        selectRecipientsLabel$,
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
