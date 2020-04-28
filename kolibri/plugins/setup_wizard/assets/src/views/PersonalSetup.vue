<template>

  <div>
    <ProgressToolbar
      :removeNavIcon="false"
      @click_back="goToLastStep"
    />
    <KPageContainer>
      <SuperuserCredentialsForm
        ref="credentials"
        :isFinalStep="true"
        :description="$tr('adminAccountCreationDescriptionPersonal')"
        @click_next="finalizeOnboardingData"
      />
    </KPageContainer>
  </div>

</template>


<script>

  // PersonalSetup only has one step: Providing user credentials
  import every from 'lodash/every';
  import commonSetupElements from '../../../commonSetupElements';
  import ProgressToolbar from './ProgressToolbar';
  import SuperuserCredentialsForm from './onboarding-forms/SuperuserCredentialsForm';

  export default {
    name: 'PersonalSetup',
    components: {
      ProgressToolbar,
      SuperuserCredentialsForm,
    },
    mixins: [commonSetupElements],
    methods: {
      goToLastStep() {
        this.$router.push({
          name: 'PLANNED_USE',
        });
      },
      finalizeOnboardingData() {
        // Set defaults that are skipped in Personal setup. This should guarantee
        // that the non-superuser-related payload is valid for the 'deviceprovision' endpoint
        this.$store.dispatch('setPersonalUsageDefaults');

        const {
          full_name,
          username,
          password,
          gender,
          birth_year,
        } = this.$store.state.onboardingData.superuser;

        // Validate the superuser info in case user ended up in a bad state here via history
        // and redirect to credentials page
        if (every([full_name, username, password, gender, birth_year])) {
          this.$store.dispatch('provisionDevice');
        } else {
          return this.$refs.credentials.focusOnInvalidField();
        }
      },
    },
    $trs: {
      adminAccountCreationDescriptionPersonal: {
        message: 'This account allows you to manage all content and user accounts on this device',
        context: 'Alternative description for SuperuserCredentialsForm when doing a personal setup',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
