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
    methods: {
      handleSubmit() {
        const currentLanguageId = this.$store.state.onboardingData.language_id;
        this.$store.commit('SET_LANGUAGE', currentLanguageId);
        this.$emit('click_next');
      },
    },
    $trs: {
      languageFormHeader: 'Please select the default language for Kolibri',
    },
  };

</script>


<style lang="scss" scoped></style>
