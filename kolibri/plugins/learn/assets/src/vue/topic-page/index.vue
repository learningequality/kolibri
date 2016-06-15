<template>

  <div>
    <br><br>
    <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>
    <div class="topic-page">

      <h2 id="explore-topic-subtitle">Topics</h2>
      <div id="explore-topics">
        <div  v-for="topic in alltopics">
          <topic-card
            :title="topic.title"
            linkhref="#"
            :ntotal="topic.n_total"
            :ncomplete="topic.n_complete">
          </topic-card>
        </div>
      </div>

      <h2 id="explore-content-subtitle">Content</h2>
      <div id="explore-contents">
        <div  v-for="content in allcontents">
          <content-card
            :title="content.title"
            linkhref="#"
            :thumbsrc="content.thumbnail"
            :kind="content.kind"
            :progress="content.progress">
          </content-card>
        </div>
      </div>
    </div>

  </div>

</template>


<script>

  const breadcrumbs = require('../../demo/breadcrumbs.json');
  const alltopics = require('../../demo/graphing__topics_only.json');
  const allcontents = require('../../demo/inequalities__content_only.json');

  module.exports = {
    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
    },
    data: () => ({
      breadcrumbs,
      alltopics,
      allcontents,
    }),
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .topic-page
    background-color: $core-bg-canvas

  #explore-content-subtitle
    padding-left: 10px

  #explore-topic-subtitle
    padding-left: 10px

  #explore-topics
    overflow:hidden
    display: block

  #explore-topics div
    float: left
    padding: 10px

  #explore-contents
    overflow:hidden
    display: block

  #explore-contents div
    float: left
    padding: 10px

</style>
