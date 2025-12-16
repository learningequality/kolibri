<template>

  <OnboardingStepBase
    :title="getCommonSyncString('importFacilityAction')"
    :eventOnGoBack="backEvent"
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="steps"
    @continue="handleCredentialsSubmit"
  >
    <FacilityAdminCredentialsForm
      ref="credentialsForm"
      :disabled="formDisabled"
      :device="device"
      :facility="facility"
    />
  </OnboardingStepBase>

</template>


<script>

  import FacilityAdminCredentialsForm from 'kolibri-common/components/syncComponentSet/FacilityAdminCredentialsForm';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { FooterMessageTypes } from '../constants';
  import OnboardingStepBase from './OnboardingStepBase';

  export default {
    name: 'ImportAuthentication',
    components: { FacilityAdminCredentialsForm, OnboardingStepBase },
    mixins: [commonSyncElements],
    inject: ['wizardService'],
    data() {
      const footerMessageType = FooterMessageTypes.IMPORT_FACILITY;
      return {
        footerMessageType,
        formDisabled: false,
      };
    },
    computed: {
      // If there is only one facility we skipped a step, so we're on step 1
      step() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 1 : 2;
      },
      // If there is only one facility we skipped a step, so we only have 4 steps
      steps() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 4 : 5;
      },
      // If there is only one facility, we skipped a step on our way here, so skip it going back
      backEvent() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1
          ? { type: 'BACK_SKIP_FACILITY_FORM' }
          : { type: 'BACK' };
      },
      facility() {
        return this.wizardService.state.context.selectedFacility;
      },
      device() {
        return this.wizardService.state.context.importDevice;
      },
    },
    methods: {
      callSubmitCredentials() {
        const $credentialsForm = this.$refs.credentialsForm;
        if ($credentialsForm) {
          // The form makes the call to the startpeerfacilityimport endpoint
          return $credentialsForm.startImport().then(importStarted => {
            if (importStarted) {
              return {
                username: $credentialsForm.username,
                password: $credentialsForm.password,
              };
            } else {
              return false;
            }
          });
        } else {
          return Promise.resolve(false);
        }
      },
      handleCredentialsSubmit() {
        this.formDisabled = true;
        this.callSubmitCredentials().then(data => {
          if (data) {
            /* seems to do nothing?
          this.$emit('update:facility', {
            name: this.selectedFacility.name,
            id: this.selectedFacility.id,
            username: data.username,
            password: data.password,
          });
          */
            this.wizardService.send('CONTINUE');
          } else {
            this.formDisabled = false;
          }
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
