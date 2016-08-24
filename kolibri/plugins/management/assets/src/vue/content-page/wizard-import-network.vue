<template>

  <modal title="Import Channel from the Internet" @cancel="cancelImportExportWizard">
    <div slot="body">
      <p>Please enter a content channel ID:</p>
      <div>
        <input placeholder="67fbdf31efa94b4d8bd1a3abd2993196" v-model="contentId">
      </div>
    </div>
    <div slot="buttons">
      <button @click="cancelImportExportWizard">
        Cancel
      </button>
      <button @click="import">
        Import
      </button>
    </div>
  </modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'modal': require('./modal'),
      'icon-button': require('icon-button'),
    },
    data: () => ({
      contentId: '',
    }),
    methods: {
      import() {
        this.remoteImportContent(this.contentId);
      },
    },
    vuex: {
      actions: {
        remoteImportContent: actions.remoteImportContent,
        cancelImportExportWizard: actions.cancelImportExportWizard,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
