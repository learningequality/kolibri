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
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import FacilityTaskPanel from '../../../../../device/assets/src/views/FacilitiesPage/FacilityTaskPanel.vue';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';
  import { SetupTasksResource } from '../../api';

  export default {
    name: 'LoadingTaskPage',
    components: {
      FacilityTaskPanel,
      OnboardingForm,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      facility: {
        type: Object,
        required: true,
      },
      device: {
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
        SetupTasksResource.fetchCollection({ force: true }).then(tasks => {
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
        this.clearTasks()
          .then(() => {
            return this.startPeerImportTask({
              facility_name: this.facilityName,
              facility: this.facility.id,
              baseurl: this.device.baseurl,
              username: this.facility.username,
              password: this.facility.password,
            });
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      cancelTask() {
        return SetupTasksResource.canceltask(this.loadingTask.id);
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
        return SetupTasksResource.cleartasks();
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
        context: 'Page title',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
