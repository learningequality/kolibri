<template>

  <OnboardingStepBase
    ref="container"
    :title="$tr('languageFormHeader')"
    @continue="handleSubmit"
    @resize="updateWidth"
  >
    <LanguageSwitcherList :parentBreakpoint="parentBreakpoint" />
  </OnboardingStepBase>

</template>


<script>

  import LanguageSwitcherList from 'kolibri.coreVue.components.LanguageSwitcherList';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'DefaultLanguageForm',
    components: {
      OnboardingStepBase,
      LanguageSwitcherList,
    },
    data() {
      return {
        parentBreakpoint: 4,
      };
    },
    mounted() {
      this.updateWidth();
      window.addEventListener('resize', this.updateWidth);
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.updateWidth);
    },
    inject: ['wizardService'],
    methods: {
      handleSubmit() {
        this.wizardService.send('CONTINUE');
      },
      updateWidth() {
        const element = this.$refs.container.$el;
        const width = element.offsetWidth;
        let num = 4;

        if (width < 440) {
          num = 0;
        } else if (width < 520) {
          num = 1;
        } else if (width < 600) {
          num = 2;
        } else if (width < 660) {
          num = 3;
        } else {
          num = 4;
        }
        this.parentBreakpoint = num;
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
