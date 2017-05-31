<template>

  <div>
    <card-grid :header="computedTitle" v-if="slicedContents.length">
      <content-grid-item
        v-for="content in slicedContents"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :link="genContentLink(content.id)"/>
    </card-grid>

    <div class="button-wrapper" v-if="contents.length > nCollapsed">
      <icon-button @click="toggle()" :text="less" v-if="expanded">
        <mat-svg category="hardware" name="keyboard_arrow_up"/>
      </icon-button>
      <icon-button @click="toggle()" :text="more" v-else>
        <mat-svg category="hardware" name="keyboard_arrow_down"/>
      </icon-button>
    </div>
  </div>

</template>


<script>

  const PageNames = require('../../constants').PageNames;

  module.exports = {
    $trNameSpace: 'learnExpandable',
    $trs: {
      less: 'Show less',
      more: 'Show more',
      defaultTitle: 'Contents',
    },
    props: {
      title: {
        type: String,
        default: '',
      },
      contents: {
        type: Array,
        default: () => [],
      },
      nCollapsed: {
        type: Number,
        default: 3,
      },
      nExpanded: {
        type: Number,
        default: 9,
      },
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'content-grid-item': require('../card-grid/content-grid-item'),
      'card-grid': require('../card-grid'),
    },
    data() {
      return {
        expanded: false,
      };
    },
    computed: {
      slicedContents() {
        const num = this.expanded ? this.nExpanded : this.nCollapsed;
        return this.contents.slice(0, num);
      },
      less() {
        return this.$tr('less');
      },
      more() {
        return this.$tr('more');
      },
      computedTitle() {
        return this.title.length ? this.title : this.$tr('defaultTitle');
      },
    },
    methods: {
      toggle() {
        this.expanded = !this.expanded;
      },
      genContentLink(id) {
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        channelId: (state) => state.core.channels.currentId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .button-wrapper
    text-align: center
    margin-top: 1em

</style>
