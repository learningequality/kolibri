<template>

  <div>
    <page-header :title='title'>
      <svg slot='icon' role="presentation" fill="#996189" height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
        <path d="M0 0h24v24H0z" fill="none"></path>
      </svg>
    </page-header>

    <card-grid v-if="contents.length">
      <content-card
        v-for="content in contents"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.id">
      </content-card>
    </card-grid>

    <div class='button-wrapper'>
      <button @click='toggle()' v-if='expanded'>
        <i class="material-icons">&#xE5CE;</i> Show Less
      </button>
      <button class='pure-button' @click='toggle()' v-else>
        <i class="material-icons">&#xE5CF;</i> <span>Show More</span>
      </button>
    </div>
  </div>

</template>


<script>

  const N_COLLAPSED = 6;
  const N_EXPANDED = 12;

  module.exports = {
    components: {
      'content-card': require('../content-card'),
      'page-header': require('../page-header'),
      'card-grid': require('../card-grid'),
    },
    data() {
      return {
        expanded: false,
        title: 'Learn',
      };
    },
    computed: {
      contents() {
        const num = this.expanded ? N_EXPANDED : N_COLLAPSED;
        return this.recommendations.slice(0, num);
      },
    },
    methods: {
      toggle() {
        this.expanded = !this.expanded;
      },
    },
    vuex: {
      getters: {
        recommendations: state => state.pageState.recommendations,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .button-wrapper
    text-align: center

</style>
