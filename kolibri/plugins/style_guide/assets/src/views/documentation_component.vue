<template>

  <div>

    <h2>{{ json }}</h2>

  </div>

</template>

<script>

  var json = require('vue-doc!kolibri.coreVue.components.textbox'); // eslint-disable-line

  module.exports = {
    components: {
    },

    data: () => ({
      json
    })
  }

</script>
