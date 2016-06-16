<template>

  <div>
    <div>
      <h1>Next</h1>
      <div class="card-list">
        <content-card
          v-for="content in contents.next"
          class="card"
          linkhref="#"
          :title="content.title"
          :thumbsrc="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress">
        </content-card>
      </div>
    </div>
    <div>
      <h1>Popular</h1>
      <div class="card-list">
        <content-card
          v-for="content in contents.popular"
          class="card"
          linkhref="#"
          :title="content.title"
          :thumbsrc="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress">
        </content-card>
      </div>
    </div>
    <div>
      <h1>To Review :(</h1>
      <div class="card-list">
        <content-card
          v-for="content in contents.review"
          class="card"
          linkhref="#"
          :title="content.title"
          :thumbsrc="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress">
        </content-card>
      </div>
    </div>
  </div>

</template>


<script>

  const contents = require('../demo/content_recommendation_data.json');
  module.exports = {
    components: {
      'content-card': require('../vue/content-card'),
    },
    data: () => ({
      contents,
    }),
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .card-list
    overflow: hidden
    display: block
    margin-left: -10px

  .card-list .card
    float: left
    margin: 10px

</style>
