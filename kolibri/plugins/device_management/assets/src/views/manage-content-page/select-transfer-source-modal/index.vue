<template>

  <component
    v-if="wizardPageName!==''"
    :is="wizardComponent"
  />

</template>


<script>

  import { ContentWizardPages } from '../../../constants';
  import selectImportSource from './select-import-source-modal';
  import selectDriveModal from './select-drive-modal';

  const pageNameComponentMap = {
    [ContentWizardPages.SELECT_IMPORT_SOURCE]: selectImportSource,
    [ContentWizardPages.SELECT_DRIVE]: selectDriveModal,
  };

  export default {
    name: '',
    components: {},
    props: {},
    computed: {
      wizardComponent() {
        return pageNameComponentMap[this.wizardPageName];
      },
    },
    methods: {},
    vuex: {
      getters: {
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
      },
      actions: {},
    },
    $trs: {},
  };

</script>


<style lang="stylus" scoped></style>
