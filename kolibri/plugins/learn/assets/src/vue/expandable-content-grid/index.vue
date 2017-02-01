<template>

  <div>
    <card-grid :header="computedTitle" v-if="slicedContents.length">
      <content-grid-item
        v-for="content in slicedContents"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.id"/>
    </card-grid>

    <div class="button-wrapper" v-if="contents.length > nCollapsed">
      <icon-button @click="toggle()" :text="less" v-if="expanded">
        <svg icon-name="material-hardware-keyboard_arrow_up"/>
      </icon-button>
      <icon-button @click="toggle()" :text="more" v-else>
        <svg icon-name="material-hardware-keyboard_arrow_down"/>
      </icon-button>
    </div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'learnExpandable',
    $trs: {
      less: 'Show Less',
      more: 'Show More',
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
      'content-grid-item': require('../content-grid-item'),
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
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .button-wrapper
    text-align: center
    margin-top: 1em

</style>
