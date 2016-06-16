<template>

  <div class="topic-page">
    <br><br>
    <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>

    <h2>Topics</h2>
    <div class="card-list">
      <topic-card
        v-for="topic in alltopics"
        class="card"
        linkhref="#"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-card>
    </div>

    <h2>Content</h2>
    <div class="card-list">
      <content-card
        v-for="content in allcontents"
        class="card"
        linkhref="#"
        :title="content.title"
        :thumbsrc="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress">
      </content-card>
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
    padding-left: 10px

  .card-list
    overflow: hidden
    display: block
    margin-left: -10px

  .card-list .card
    float: left
    margin: 10px

</style>
