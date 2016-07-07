<template>

  <div>

    <breadcrumbs
      v-if="$route.name === 'explore-content'">
    </breadcrumbs>
    <a
      v-if="$route.name === 'learn-content'"
      v-link="{ name: 'learn-content' }">
      Home
    </a>

    <div>
      <h2>Learn Content</h2>
      <h3>
        {{ title }}
      </h3>
      <p>
        {{ description }}
      </p>
      <content-render
        :id="id"
        :kind="kind"
        :files="files"
        :content-id="contentId"
        :channel-id="channelId"
        :available="available"
        :extra-fields="extraFields">
      </content-render>
      <div class="rec-grid card-list">
        <content-card
          v-for="content in recommended"
          class="card"
          linkhref="#"
          :title="content.title"
          :thumbsrc="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress">
        </content-card>
      </div>
    </div>

  </div>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'content-card': require('../content-card'),
      'content-render': require('content-renderer'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        id: state => state.id,
        title: (state) => state.full.title,
        description: (state) => state.full.description,
        recommended: (state) => state.full.recommended,
        kind: (state) => state.full.kind,
        files: (state) => state.full.files,
        contentId: (state) => state.full.content_id,
        channelId: (state) => state.channel,
        available: (state) => state.full.available,
        extraFields: (state) => state.full.extra_fields,
      },
      actions: require('../../actions'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .rec-grid content-card img
    max-width: 250px
    max-height: 250px
    margin: 0 15px 0 0

  .rec-grid
    display: inline-block

</style>
