<template>

  <OnboardingForm
    :header="header"
  >
    <FacilityTaskPanel
      v-if="loadingTask.status"
      :task="loadingTask"
      @cancel="cancelTask"
    />
    <template #buttons>
      <KButton
        v-if="loadingTask.status === 'COMPLETED'"
        primary
        :text="coreString('continueAction')"
        @click="handleClickContinue"
      />
      <template v-else-if="loadingTask.status === 'FAILED'">
        <KButtonGroup>
          <KButton
            primary
            :text="coreString('retryAction')"
            @click="retryImport"
          />
          <KButton
            :text="coreString('startOverAction')"
            appearance="flat-button"
            @click="startOver"
          />
        </KButtonGroup>
      </template>
      <span v-else></span>
    </template>
  </OnboardingForm>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import FacilityTaskPanel from '../../../../../device/assets/src/views/FacilitiesPage/FacilityTaskPanel.vue';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';

  export default {
    name: 'LoadingTaskPage',
    components: {
      FacilityTaskPanel,
      OnboardingForm,
    },
    mixins: [commonCoreStrings],
    props: {
      facility: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        loadingTask: {},
        isPolling: false,
      };
    },
    computed: {
      header() {
        return this.$tr('loadingFacilityTitle', { facility: this.facilityName });
      },
      facilityName() {
        return this.facility.name;
      },
    },
    beforeMount() {
      this.isPolling = true;
      this.pollTask();
    },
    methods: {
      pollTask() {
        TaskResource.list({ queue: 'facility_task' }).then(tasks => {
          this.loadingTask = {
            ...tasks[0],
            facility_name: this.facilityName,
          };
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollTask();
          }, 2000);
        }
      },
      retryImport() {
        TaskResource.restart(this.loadingTask.id).catch(error => {
          this.$store.dispatch('handleApiError', error);
        });
      },
      cancelTask() {
        return TaskResource.canceltask(this.loadingTask.id);
      },
      startOver() {
        this.isPolling = false;
        this.clearTasks().then(() => {
          this.goToRootUrl();
        });
      },
      goToRootUrl() {
        this.$router.replace('/');
      },
      clearTasks() {
        return TaskResource.clearall();
      },
      handleClickContinue() {
        this.isPolling = false;
        this.clearTasks();
        this.$emit('click_next');
      },
    },
    $trs: {
      loadingFacilityTitle: {
        message: "Loading '{facility}'",
        context: 'Page title indicating that the facility is loading.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
