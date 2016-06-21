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

  module.exports = {
    components: {
      'content-card': require('../vue/content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        contents: state => state.recommended,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
