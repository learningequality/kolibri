<template>

  <SidePanelLayout
    :closePanel="closePanel"
    :title="selectCourseLabel$()"
  >
    <template #default>
      <!-- Content for selecting a course to assign can go here -->
    </template>
    <template #bottomNavigation>
      <div class="bottom-actions">
        <KButton
          :text="cancelAction$()"
          @click="closePanel"
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
  import SidePanelLayout from '../../../../common/sidePanel/SidePanelLayout.vue';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';

  export default {
    name: 'AssignCourseIndexSubpage',
    components: {
      SidePanelLayout,
    },
    setup(props, { emit }) {
      const route = useRoute();
      const router = useRouter();
      const closePanel = () => {
        emit('closePanel');
      };

      const { cancelAction$ } = coreStrings;
      const { selectCourseLabel$, selectRecipientsLabel$ } = coursesStrings;

      const selectRecipients = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
          }),
        );
      };

      return {
        closePanel,
        selectRecipients,

        cancelAction$,
        selectCourseLabel$,
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
