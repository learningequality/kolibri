<template>

  <div>
    <h3>
      {{ title }}
    </h3>
    <div v-el:container>
    </div>
  </div>

</template>


<script>

  const Kolibri = require('kolibri');

  module.exports = {
    props: [
      'channelId',
      'contentId',
      'kind',
      'extension',
      'title',
    ],
    computed: {
      contentType() {
        return `${this.kind}/${this.extension}`;
      },
    },
    created() {
      this.contentData = { url: '#' };
    },
    ready() {
      console.log(`content_render:${this.contentType}`);
      Kolibri.emit(`content_render:${this.contentType}`, this.$els.container, this.contentData);
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
