<template>

  <OnboardingForm
    :header="$tr('languageFormHeader')"
    :submitText="submitText"
    @submit="setLanguage"
  >
    <LanguageSwitcherList />
  </OnboardingForm>

</template>


<script>

  import { mapMutations, mapState } from 'vuex';
  import LanguageSwitcherList from 'kolibri.coreVue.components.LanguageSwitcherList';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'DefaultLanguageForm',
    components: {
      OnboardingForm,
      LanguageSwitcherList,
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapState({
        currentLanguageId: state => state.onboardingData.language_id,
      }),
    },
    methods: {
      ...mapMutations({
        submitDefaultLanguage: 'SET_LANGUAGE',
      }),
      setLanguage() {
        this.submitDefaultLanguage(this.currentLanguageId);
        this.$emit('submit');
      },
    },
    $trs: {
      languageFormHeader: 'Please select the default language for Kolibri',
    },
  };

</script>


<style lang="scss" scoped></style>
