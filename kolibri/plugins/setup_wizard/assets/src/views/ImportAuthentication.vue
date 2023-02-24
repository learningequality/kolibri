<template>

  <OnboardingStepBase
    :title="$tr('importFacilityTitle')"
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

  import { FacilityAdminCredentialsForm } from 'kolibri.coreVue.componentSets.sync';
  import OnboardingStepBase from './OnboardingStepBase';

  export default {
    name: 'ImportAuthentication',
    components: { FacilityAdminCredentialsForm, OnboardingStepBase },
    inject: ['wizardService'],
    data() {
      return {
        formDisabled: false,
      };
    },
    computed: {
      facility() {
        return this.wizardService._state.context.selectedFacility;
      },
      device() {
        return this.wizardService._state.context.importDevice;
      },
    },
    mounted() {
      console.log('ImportAuthentication', this.wizardService.state);
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
    $trs: {
      importFacilityTitle: {
        message: 'Import learning facility',
        context:
          'Title of a page where user will sign in to a remote facility to begin the syncing process',
      },
    },
  };

</script>


<style scoped lang="scss"></style>
