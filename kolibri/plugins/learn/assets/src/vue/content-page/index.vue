<template>

  <div>

    <page-header :title='title'>
      <breadcrumbs
        v-if="pageMode === $options.PageModes.EXPLORE"
        slot='extra-nav'
        :rootid='rootTopicId'
        :crumbs='breadcrumbs'>
      </breadcrumbs>
      <a v-else slot='extra-nav' v-link="{ name: $options.PageNames.LEARN_ROOT }">
        ← Learn
      </a>
      <content-icon
        slot='icon'
        :kind="kind"
        :progress="progress">
      </content-icon>
    </page-header>

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
    </div>

    <card-grid header='Recommended' v-if="pageMode === $options.PageModes.LEARN">
      <content-card
        v-for="content in recommended"
        :id="content.id"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress">
      </content-card>
    </card-grid>

  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const getters = require('../../state/getters');

  module.exports = {
    mixins: [constants], // makes constants available in $options
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'content-icon': require('../content-icon'),
      'page-header': require('../page-header'),
      'content-card': require('../content-card'),
      'content-render': require('content-renderer'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        // general state
        pageMode: getters.pageMode,
        rootTopicId: state => state.rootTopicId,

        // attributes for this content item
        id: (state) => state.pageState.content.id,
        title: (state) => state.pageState.content.title,
        description: (state) => state.pageState.content.description,
        kind: (state) => state.pageState.content.kind,
        files: (state) => state.pageState.content.files,
        contentId: (state) => state.pageState.content.content_id,
        available: (state) => state.pageState.content.available,
        extraFields: (state) => state.pageState.content.extra_fields,
        breadcrumbs: (state) => state.pageState.content.breadcrumbs,

        // only used on learn page
        recommended: (state) => state.pageState.recommended,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>

