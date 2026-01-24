<template>

  <SidePanelLayout
    :goBack="goBack"
    :title="selectRecipientsLabel$()"
    :subtitle="courseNameLabel$({ name: selectedCourse.title })"
  >
    <template #default>
      <LearnersAndGroupsSelector
        showSelectClassOption
        :classId="classId"
        :disabled="isSaving"
        :selectedGroupIds.sync="selectedGroupIds"
        :adHocLearners.sync="selectedLearnerIds"
      />
    </template>
    <template #bottomNavigation>
      <div>
        <!-- Placeholder for selected learners count -->
      </div>
      <div class="bottom-actions">
        <KButton
          :text="backAction$()"
          :disabled="isSaving"
          @click="goBack"
        />
        <KButton
          primary
          :disabled="isAssignButtonDisabled"
          :text="assignCourseAction$()"
          @click="handleAssignCourse"
        />
      </div>
    </template>
  </SidePanelLayout>

</template>


<script>

  import { useRoute, useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { computed, onMounted, ref } from 'vue';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';
  import { injectAssignCourse } from '../../../composables/useAssignCourse';
  import LearnersAndGroupsSelector from '../../../../common/assignments/LearnersAndGroupsSelector.vue';

  export default {
    name: 'SelectRecipientsSubpage',
    components: {
      SidePanelLayout,
      LearnersAndGroupsSelector,
    },
    setup(props, { emit }) {
      const route = useRoute();
      const router = useRouter();
      const isSaving = ref(false);
      const { createSnackbar } = useSnackbar();

      const { classId, selectedCourse, assignCourse, selectedGroupIds, selectedLearnerIds } =
        injectAssignCourse();

      const { backAction$, defaultErrorMessage$ } = coreStrings;
      const { courseNameLabel$, assignCourseAction$, selectRecipientsLabel$ } = coursesStrings;

      const goBack = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_INDEX,
          }),
        );
      };

      const isAssignButtonDisabled = computed(() => {
        if (isSaving.value) {
          return true;
        }
        return selectedGroupIds.value.length === 0 && selectedLearnerIds.value.length === 0;
      });

      const handleAssignCourse = async () => {
        isSaving.value = true;
        try {
          await assignCourse();
          emit('success');
        } catch (error) {
          createSnackbar(defaultErrorMessage$());
        } finally {
          isSaving.value = false;
        }
      };

      onMounted(() => {
        if (!selectedCourse.value) {
          goBack();
        }
      });

      return {
        isSaving,
        classId,
        selectedCourse,
        selectedGroupIds,
        selectedLearnerIds,
        isAssignButtonDisabled,

        goBack,
        handleAssignCourse,

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
