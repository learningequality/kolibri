<template>

  <OnboardingStepBase
    :title="header"
    :navDisabled="!['COMPLETED', 'FAILED'].includes(loadingTask.status)"
    @continue="$emit('click_next')"
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
        <KButton
          :text="coreString('startOverAction')"
          appearance="flat-button"
          @click="startOver"
        />
        <KButton
          primary
          :text="coreString('retryAction')"
          @click="retryImport"
        />
      </template>
      <span v-else></span>
    </template>
  </OnboardingStepBase>

</template>


<script>

  import { FacilityTaskPanel } from 'kolibri.coreVue.componentSets.sync';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'LoadingTaskPage',
    components: {
      FacilityTaskPanel,
      OnboardingStepBase,
    },
    inject: ['wizardService'],
    mixins: [commonCoreStrings],
    data() {
      return {
        loadingTask: { status: '' },
        isPolling: false,
      };
    },
    computed: {
      facility() {
        return this.wizardService._state.context.selectedFacility;
      },
      header() {
        return this.$tr('importFacilityTitle');
      },
      facilityName() {
        return this.facility.name;
      },
    },
    watch: {
      // Mitigate chance of getting stuck after the task has completed
      loadingTask(newVal) {
        if (newVal.status === undefined) {
          this.handleClickContinue();
        }
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
            extra_metadata: {
              facility_name: this.facilityName,
            },
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
        return TaskResource.cancel(this.loadingTask.id);
      },
      startOver() {
        this.isPolling = false;
        this.clearTasks().then(() => {
          this.$emit('start_over');
        });
      },
      clearTasks() {
        return TaskResource.clearAll();
      },
      handleClickContinue() {
        this.isPolling = false;
        this.clearTasks();
        this.wizardService.send('CONTINUE');
      },
    },
    $trs: {
      importFacilityTitle: {
        message: 'Import learning facility',
        context:
          'Title of a page where user will sign in to a remote facility to begin the syncing process',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
