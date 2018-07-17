<template>

  <onboarding-form
    :header="$tr('languageFormHeader')"
    :submitText="submitText"
    @submit="setLanguage"
  >
    <language-switcher-list />
  </onboarding-form>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import LanguageSwitcherList from 'kolibri.coreVue.components.LanguageSwitcherList';

  import onboardingForm from '../OnboardingForm';

  export default {
    name: 'DefaultLanguageForm',
    $trs: {
      languageFormHeader: 'Please select the default language for Kolibri',
    },
    components: {
      onboardingForm,
      LanguageSwitcherList,
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
      isMobile: {
        type: Boolean,
        required: false,
      },
    },
    computed: {
      ...mapState({
        currentLanguageId: state => state.onboardingData.language_id,
      }),
    },
    methods: {
      ...mapActions(['submitDefaultLanguage']),
      setLanguage() {
        this.submitDefaultLanguage(this.currentLanguageId);
        this.$emit('submit');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
