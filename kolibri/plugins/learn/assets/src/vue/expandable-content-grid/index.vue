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

  <div class="button-wrapper" v-if="contents.length > nCollapsed">
    <button class="disclosure-button" @click="toggle()" v-if="expanded">
      <svg fill="#000000" height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"></path>
        <path d="M0 0h24v24H0z" fill="none"></path>
      </svg>
      Show Less
    </button>
    <button class="disclosure-button" @click="toggle()" v-else>
      <svg fill="#000000" height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path>
        <path d="M0 0h24v24H0z" fill="none"></path>
      </svg>
      Show More
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
