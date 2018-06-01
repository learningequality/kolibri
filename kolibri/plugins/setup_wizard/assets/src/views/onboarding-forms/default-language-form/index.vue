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

  import { mapGetters, mapActions } from 'kolibri.utils.vuexCompat';
  import languageSwitcherList from 'kolibri.coreVue.components.languageSwitcherList';
  import { submitDefaultLanguage } from '../../../state/actions/forms';
  import onboardingForm from '../onboarding-form';

  export default {
    name: 'defaultLanguageForm',
    $trs: {
      languageFormHeader: 'Please select the default language for Kolibri',
    },
    components: {
      onboardingForm,
      languageSwitcherList,
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
      ...mapGetters({
        currentLanguageId: state => state.onboardingData.language_id,
      }),
    },
    methods: {
      ...mapActions({
        submitDefaultLanguage,
      }),
      setLanguage() {
        this.submitDefaultLanguage(this.currentLanguageId);
        this.$emit('submit');
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
