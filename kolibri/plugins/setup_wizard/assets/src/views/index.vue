<template>

  <div class="onboarding">
    <progress-toolbar />

    <default-language-form />

  </div>

</template>


<script>

  import { provisionDevice } from '../state/actions';
  import progressToolbar from './progress-toolbar';
  import defaultLanguageForm from './setup-forms/default-language-form';

  export default {
    name: 'Onboarding',
    components: { progressToolbar, defaultLanguageForm },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
