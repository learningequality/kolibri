<template>

  <OnboardingForm
    :header="$tr('languageFormHeader')"
    @submit="handleSubmit"
  >
    <LanguageSwitcherList />
  </OnboardingForm>

</template>


<script>

  import LanguageSwitcherList from 'kolibri.coreVue.components.LanguageSwitcherList';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'DefaultLanguageForm',
    components: {
      OnboardingForm,
      LanguageSwitcherList,
    },
    inject: ['wizardService'],
    methods: {
      handleSubmit() {
        const currentLanguageId = this.$store.state.onboardingData.language_id;
        this.$store.commit('SET_LANGUAGE', currentLanguageId);
        this.wizardService.send('CONTINUE');
      },
    },
    $trs: {
      languageFormHeader: {
        message: 'Please select the default language for Kolibri',
        context: 'Admins must pick the default language they want to use in Kolibri.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
