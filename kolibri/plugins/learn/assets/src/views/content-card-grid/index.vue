<template>

  <div class="content-grid">
    <header v-if="header" class="content-grid-header">
      <h2> {{header}} </h2>
      <span v-if="subheader"> {{subheader}} </span>
    </header>

    <span v-for="content in contents" class="content-card">
      <slot
        :title="content.title"
        :thumbnail="content.thumnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.id">

        <content-card
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :link="genLink(content.id, content.kind)"/>

      </slot>
    </span>

  </div>

</template>


<script>

  const validateLinkObject = require('kolibri.utils.validateLinkObject');

  module.exports = {
    props: {
      contents: {
        type: Array,
        required: true,
      },
      header: {
        type: String,
        required: false,
      },
      subheader: {
        type: String,
        required: false,
      },
      genLink: {
        type: Function,
        validator(value) {
          return validateLinkObject(value(1, 'exercise'));
        },
        default: () => {},
        required: false,
      },
    },
    components: {
      'content-card': require('../content-card'),
    },
    vuex: {
      getters: {
        channelId: (state) => state.core.channels.currentId,
      },
    }
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .content-card
    margin: 10px

</style>
