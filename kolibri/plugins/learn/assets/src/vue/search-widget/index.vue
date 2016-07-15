<template>

  <div class='pane'>

    <!-- results -->
    <div class='results' v-if="!loading">
      <h4>
        {{ message }}
      </h4>

      <card-grid v-if="topics.length > 0">
        <topic-card
          v-for="topic in topics"
          class="card"
          :id="topic.id"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-card>
      </card-grid>

      <card-grid v-if="contents.length > 0">
        <content-card
          v-for="content in contents"
          class="card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :id="content.id">
        </content-card>
      </card-grid>
    </div>

    <!-- search block -->
    <div class='top'>
      <input
        type="search"
        placeholder="Find content..."
        autocomplete="off"
        v-focus-model="focused"
        v-model="searchterm"
        id="search"
        name="search"
        @keyup="search() | debounce 500">
      <button type="reset" @click="clear()">
        X
      </button>
    </div>

  </div>

</template>


<script>

  const focusModel = require('vue-focus').focusModel;
  const actions = require('../../actions');


  module.exports = {
    directives: { focusModel },
    data() {
      return {
        searchterm: '',
        focused: false,
      };
    },
    computed: {
      message() {
        if (this.topics.length || this.contents.length) {
          return 'Search results:';
        } else if (!this.topics.length && !this.contents.length) {
          return 'Could not find any matches.';
        }
        return '';
      },
    },
    methods: {
      clear() {
        this.searchterm = '';
        this.focused = true;
        this.triggerSearch(this.searchterm);
      },
      search() {
        this.triggerSearch(this.searchterm);
      },
    },
    components: {
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        contents: state => state.searchState.contents,
        topics: state => state.searchState.topics,
        loading: state => state.searchLoading,
      },
      actions: {
        triggerSearch: actions.triggerSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn.styl'

  .pane
    // background-color: $core-bg-canvas
    margin-right: $right-margin

  .top
    background-color: $core-bg-canvas
    position: fixed
    top: 0
    width: 100%
    height: 3em

    input
      width: 60%
      display: block


  .results
    margin-right: $right-margin
    width-auto-adjust()

</style>
