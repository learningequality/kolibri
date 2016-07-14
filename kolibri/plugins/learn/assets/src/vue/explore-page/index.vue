<template>

  <div>

    <page-header :title='title'>
      <breadcrumbs
        v-if='!isRoot'
        slot='extra-nav'
        :rootid='rootTopicId'
        :crumbs='topic.breadcrumbs'>
      </breadcrumbs>
      <div slot='icon' class='icon'>
        <svg v-if='isRoot' role="presentation" fill="#3A3A3A" height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"></path>
          <path d="M0 0h24v24H0z" fill="none"></path>
        </svg>
        <svg v-else width="30px" height="24px" viewbox="0 0 30 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#3A3A3A">
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g transform="translate(0.000000, -2.000000)" fill="#3A3A3A">
              <path d="M12,2 L3,2 C1.35,2 0.015,3.35 0.015,5 L0,23 C0,24.65 1.35,26 3,26 L27,26 C28.65,26 30,24.65 30,23 L30,8 C30,6.35 28.65,5 27,5 L15,5 L12,2 L12,2 Z"></path>
            </g>
          </g>
        </svg>
      </div>
    </page-header>

    <p v-if='topic.description'>
      {{ topic.description }}
    </p>

    <span class="visuallyhidden" v-if="subtopics.length">You can navigate groups of content through headings.</span>

    <card-grid v-if="subtopics.length">
      <topic-card
        v-for="topic in subtopics"
        :id="topic.id"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-card>
    </card-grid>

    <card-grid v-if="contents.length">
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

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'page-header': require('../page-header'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'card-grid': require('../card-grid'),
    },
    computed: {
      title() {
        // TODO - i18n
        return this.isRoot ? 'Explore' : this.topic.title;
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

  .icon svg
    fill: $core-text-default
    width: 1em
    height: 1em

</style>
