<template>

  <div>

    <div class="search-tools">

      <search-widget class="search" :searchtoggled.sync="searchToggled"></search-widget>

    </div>

    <div class="tool-bar">

      <breadcrumbs
        v-if='!isRoot'
        v-show="!searchToggled"
        class='breadcrumbs'
        :rootid='rootTopicId'
        :crumbs='topic.breadcrumbs'
        :current='topic.title'>
      </breadcrumbs>

    </div>

  </div>

  <!-- Toggles top margin if sidebar overlay is exposed -->
  <section class="explore" v-show="!searchToggled" transition="fade">

    <p v-if='topic.description'>
      {{ topic.description }}
    </p>

    <card-grid :header="isRoot ? 'Topics' : '' " v-if="subtopics.length">
      <topic-card
        v-for="topic in subtopics"
        :id="topic.id"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-card>
    </card-grid>

    <card-grid :header="isRoot ? 'Content' : '' " v-if="contents.length">
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

  </section>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'search-widget': require('../search-widget'),
      'card-grid': require('../card-grid'),
    },
    data() {
      return {
        searchToggled: false,
      };
    },
    methods: {
      searchToggleSwitch() {
        this.searchToggled = !this.searchToggled;
      },
    },
    vuex: {
      getters: {
        rootTopicId: state => state.rootTopicId,
        topic: state => state.pageState.topic,
        subtopics: state => state.pageState.subtopics,
        contents: state => state.pageState.contents,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn'

  .tool-bar
    width-auto-adjust()
    top: 0
    padding-top: ($tool-bar-height / 4)
    padding-bottom: ($tool-bar-height / 4)
    box-sizing: border-box
    background-color: $core-bg-canvas
    z-index: 1
    overflow: auto
  .breadcrumbs
    float: left

  .breadcrumbs
  .search-tools
    height: ($tool-bar-height / 2)
    padding-top: ($tool-bar-height / 4)
    padding-bottom: ($tool-bar-height / 4)

  .search
    float: right
    width: 100%

  select
    font-size: 0.8rem
    padding: 0
    position: relative
    top: -8px
   
  .fade-transition
    transition: all 0.3s ease-out
  .fade-enter
    opacity: 0
    transform: translateY(25%)
  .fade-leave
    opacity: 0
    transform: translateY(25%)

</style>
