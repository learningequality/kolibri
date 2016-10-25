<template>

  <card-grid :header="'All Content'" v-if="all.content.length">

    <div slot="headerbox" class="allnav" role="navigation" :aria-label="$tr('pagesLabel')">

      <a v-if="hasPrev" v-link="prevPageLink" class="allnav-item">{{ $tr('prev') }}</a>
      <span v-else class="allnav-item allnav-disabled">{{ $tr('prev') }}</span>

      <a v-if="hasNext" v-link="nextPageLink" class="allnav-item">{{ $tr('next') }}</a>
      <span v-else class="allnav-item allnav-disabled">{{ $tr('next') }}</span>

    </div>

    <content-grid-item
      v-for="content in all.content"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress"
      :id="content.id">
    </content-grid-item>

  </card-grid>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    $trNameSpace: 'allContent',
    $trs: {
      prev: 'Previous',
      next: 'Next',
      pagesLabel: 'Browse all content',
    },
    computed: {
      hasNext() {
        return this.all.page < this.all.pageCount;
      },
      nextPageLink() {
        return {
          name: PageNames.LEARN_CHANNEL,
          channel: this.currentChannel,
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
          channel: this.currentChannel,
          query: { page: this.all.page - 1 },
          replace: true,
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
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

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
