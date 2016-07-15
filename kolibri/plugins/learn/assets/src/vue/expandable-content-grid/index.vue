<template>

  <card-grid :header="title" v-if="slicedContents.length">
    <content-card
      v-for="content in slicedContents"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress"
      :id="content.id">
    </content-card>
  </card-grid>

  <div class='button-wrapper' v-if="contents.length > nCollapsed">
    <button class='pure-button' @click='toggle()' v-if='expanded'>
      &#8593; Show Less
    </button>
    <button class='pure-button' @click='toggle()' v-else>
      &#8595; Show More
    </button>
  </div>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        default: 'Contents',
      },
      contents: {
        type: Array,
        default: [],
      },
      nCollapsed: {
        type: Number,
        default: 6,
      },
      nExpanded: {
        type: Number,
        default: 12,
      },
    },
    components: {
      'content-card': require('../content-card'),
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
    },
    methods: {
      toggle() {
        this.expanded = !this.expanded;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .button-wrapper
    text-align: center

</style>
