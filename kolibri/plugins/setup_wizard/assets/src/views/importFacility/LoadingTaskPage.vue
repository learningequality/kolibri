<template>

  <OnboardingForm
    :header="header"
  >
    <FacilityTaskPanel :task="loadingTask" />

    <template #buttons>
      <!-- This span is to make sure slot contents get rendered -->
      <KButton
        v-if="loadingTask.status === 'COMPLETED'"
        primary
        :text="coreString('continueAction')"
        @click="$emit('click_next')"
      />
      <template v-else-if="loadingTask.status === 'FAILED'">
        <KButton
          primary
          :text="coreString('retryAction')"
          @click="retryImport"
        />
        <KButton
          text="Start over"
          appearance="flat-button"
          @click="startOver"
        />
      </template>
      <span v-else></span>
    </template>
  </OnboardingForm>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FacilityTaskPanel from '../../../../../device/assets/src/views/FacilitiesPage/FacilityTaskPanel.vue';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';

  // TODO remove these functions since they're just for generating examples
  function makeSyncTask(status) {
    return {
      type: 'IMPORT_FACILITY',
      status,
      device_name: 'generic device',
      device_id: 'dev123',
      facility_name: 'Atkinson Hall',
      facility_id: 'fac123',
      started_by_username: '',
      bytes_sent: 1000000,
      bytes_received: 500000000,
      percentage: 0.6,
    };
  }

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
        loadingTask: makeSyncTask('COMPLETED'),
        statuses: ['COMPLETED', 'PULLING', 'PENDING'],
      };
    },
    computed: {
      header() {
        return this.$tr('loadingFacilityTitle', { facility: this.facility.name });
      },
    },
    mounted() {
      this.simulateTask();
    },
    methods: {
      simulateTask() {
        if (this.statuses.length === 0) return;
        this.loadingTask = makeSyncTask(this.statuses.pop());
        setTimeout(() => {
          this.simulateTask();
        }, 1000);
      },
      retryImport() {
        this.statuses = ['COMPLETED', 'PULLING', 'PENDING'];
        this.simulateTask();
      },
      startOver() {
        this.$router.replace('/');
      },
    },
    $trs: {
      loadingFacilityTitle: {
        message: "Loading '{facility}'",
        context: 'Page title',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
