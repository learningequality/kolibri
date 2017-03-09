<template>

  <card-grid :header="'All Content'" v-if="all.content.length" ref="grid">

    <div slot="headerbox" class="allnav" role="navigation" :aria-label="$tr('pagesLabel')">

      <router-link v-if="hasPrev" :to="prevPageLink" class="allnav-item">{{ $tr('prev') }}</router-link>
      <span v-else class="allnav-item allnav-disabled">{{ $tr('prev') }}</span>

      <router-link v-if="hasNext" :to="nextPageLink" class="allnav-item">{{ $tr('next') }}</router-link>
      <span v-else class="allnav-item allnav-disabled">{{ $tr('next') }}</span>

    </div>

    <content-grid-item
      v-for="content in contentToShow"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress"
      :link="genContentLink(content.id)"/>

  </card-grid>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;
  const responsiveElement = require('kolibri.coreVue.mixins.responsiveElement');

  module.exports = {
    $trNameSpace: 'allContent',
    $trs: {
      prev: 'Previous',
      next: 'Next',
      pagesLabel: 'Browse all content',
    },
    mixins: [responsiveElement],
    computed: {
      contentToShow() {
        const CARD_WIDTH = 200;  // duplicate of $card-width
        const CARD_GUTTER = 20;  // duplicate of $card-gutter
        const nCols = Math.max(2, Math.floor(this.elSize.width / (CARD_WIDTH + CARD_GUTTER)));
        return this.all.content.slice(0, nCols);
      },
      hasNext() {
        return this.all.page < this.all.pageCount;
      },
      nextPageLink() {
        return {
          name: PageNames.LEARN_CHANNEL,
          channel_id: this.currentChannel,
          query: { page: this.all.page + 1 },
          replace: true,
        };
      },
      hasPrev() {
        return this.all.page > 1;
      },
      prevPageLink() {
        return {
          name: PageNames.LEARN_CHANNEL,
          channel_id: this.currentChannel,
          query: { page: this.all.page - 1 },
          replace: true,
        };
      },
    },
    methods: {
      genContentLink(id) {
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    components: {
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        all: state => state.pageState.all,
        viewportWidth: state => state.core.viewport.width,
        channelId: (state) => state.core.channels.currentId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .allnav
    display: inline
    margin-left: 10px
    font-size: smaller

  .allnav-item
    margin-left: 10px

  .allnav-disabled
    color: $core-text-disabled
    cursor: not-allowed

</style>
