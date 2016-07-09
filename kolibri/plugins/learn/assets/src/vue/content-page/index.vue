<template>

  <div>

    <breadcrumbs
      v-if="pageMode === $options.PageModes.EXPLORE"
      :rootid='rootTopicId'
      :crumbs='breadcrumbs'
      :current='title'>
    </breadcrumbs>

    <a
      v-if="pageMode === $options.PageModes.LEARN"
      v-link="{ name: $options.PageNames.LEARN_ROOT }">
      Home
    </a>

    <div>
      <p>
        {{ description }}
      </p>
      <content-render
        :id="id"
        :kind="kind"
        :files="files"
        :content-id="contentId"
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

  const constants = require('../../state/constants');
  const getters = require('../../state/getters');

  module.exports = {
    mixins: [constants], // makes constants available in $options
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'content-card': require('../content-card'),
      'content-render': require('content-renderer'),
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        rootTopicId: state => state.rootTopicId,
        id: (state) => state.pageState.id,
        title: (state) => state.pageState.title,
        description: (state) => state.pageState.description,
        kind: (state) => state.pageState.kind,
        files: (state) => state.pageState.files,
        contentId: (state) => state.pageState.content_id,
        available: (state) => state.pageState.available,
        extraFields: (state) => state.pageState.extra_fields,
        breadcrumbs: (state) => state.pageState.breadcrumbs,
      },
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
