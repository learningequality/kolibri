<template>

  <div>
    <ProgressToolbar
      :removeNavIcon="removeNavIcon"
      @click_back="goToLastStep"
    />
    <div class="main">
      <KPageContainer>
        <router-view />
      </KPageContainer>
    </div>
  </div>

</template>


<script>

  import ProgressToolbar from './ProgressToolbar';

  // Template that places simplified UIBar at the top
  // and manages the non-linear flow of steps for these forms
  export default {
    name: 'UngroupedSetupSteps',
    components: {
      ProgressToolbar,
    },
    inject: ['wizardService'],
    computed: {
      removeNavIcon() {
        return this.$route.name === 'DEFAULT_LANGUAGE';
      },
    },
    methods: {
      goToLastStep() {
        this.wizardService.send('BACK');
      },
    },
  };

</script>


<style lang="scss" scoped>

  .main {
    margin: 16px;
  }

</style>
