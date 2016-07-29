<template>

  <div>
    <card-grid :header="title" v-if="slicedContents.length">
      <content-grid-item
        v-for="content in slicedContents"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.id">
      </content-grid-item>
    </card-grid>

    <div class='button-wrapper' v-if="contents.length > nCollapsed">
      <button class='disclosure-button' @click='toggle()' v-if='expanded'>
        <svg src="show-less.svg"></svg>
        Show Less
      </button>
      <button class='disclosure-button' @click='toggle()' v-else>
        <svg src="show-more.svg"></svg>
        Show More
      </button>
    </div>
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
    },
    methods: {
      toggle() {
        this.expanded = !this.expanded;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .button-wrapper
    text-align: center

  .disclosure-button
    padding-right: 1em // visually compensate for icon padding on left

    svg
      vertical-align: middle
      fill: $core-action-normal

    &:hover svg
      fill: $core-action-dark

</style>
