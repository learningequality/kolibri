<template>

  <div class="fake-modal">
    <h1>
      Please choose a source:
    </h1>
    <div class="buttons">
      <icon-button text="Internet">
        <svg src="./world.svg"></svg>
      </icon-button>
      <icon-button text="Local Drives">
        <svg src="./storage.svg"></svg>
      </icon-button>
    </div>
    <div class="buttons">
      <button @click="cancelImportExportWizard">
        Cancel
      </button>
    </div>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
    },
    data: () => ({
    }),
    methods: {
    },
    vuex: {
      getters: {
      },
      actions: {
        cancelImportExportWizard: actions.cancelImportExportWizard,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .fake-modal
    border: 2px solid black
    margin: 10px
    padding: 10px

  .buttons
    margin: 10px
    text-align: center

</style>
