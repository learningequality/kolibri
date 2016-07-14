<template>

  <card-grid header="Recommended" v-if="contents.length">
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
    <button class='material-icon-btn' @click='toggle()' v-if='expanded'>
      <i class='material-icons'>&#xE5CE;</i> Show Less
    </button>
    <button class='material-icon-btn' class='pure-button' @click='toggle()' v-else>
      <i class='material-icons'>&#xE5CF;</i> Show More
    </button>
  </div>

</template>


<script>

  const N_COLLAPSED = 6;
  const N_EXPANDED = 12;

  module.exports = {
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
