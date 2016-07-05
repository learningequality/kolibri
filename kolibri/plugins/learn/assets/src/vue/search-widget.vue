<template>

  <form v-on:submit.prevent>
    <div class="search-wrapper">
      <input type="search" required v-model="searchterm" debounce="500" class="search-box" name="search" autocomplete="off" placeholder="Find content..." @keyup="searchNodes(searchterm) | debounce 500">
      <button class="close-icon" type="reset"></button>
    </div>
  </form>
  <h2 v-if="search_topics.length > 0 ||  search_contents.length > 0">Search results</h2>
  <div v-if="search_topics.length > 0">
      <h4>Matched Topics</h4>
      <div class="card-list">
        <topic-card
          v-for="topic in search_topics"
          v-on:click="fetchNodes(topic.pk)"
          class="card"
          linkhref="#"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-card>
      </div>
    </div>

    <div v-if="search_contents.length > 0">
      <h4>Matched Content</h4>
      <div class="card-list">
        <content-card
          v-for="content in search_contents"
          class="card"
          linkhref="#"
          :title="content.title"
          :thumbsrc="content.files[0].storage_url"
          :kind="content.kind"
          :progress="content.progress"
          :pk="content.pk">
        </content-card>
      </div>
    </div>

</template>


<script>

  module.exports = {
    data() {
      return { searchterm: '' };
    },
    components: {
      'topic-card': require('./topic-card'),
      'content-card': require('./content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        search_contents: state => state.searchcontents,
        search_topics: state => state.searchtopics,
      },
      actions: require('../actions'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  
  .search-box, .close-icon, .search-wrapper
    position: relative
    padding: 4px
    
  .search-wrapper
    width: 500px
    margin: auto
    margin-top: 50px
  
  .search-box
    border-radius: 50px
    border-style:solid
    border-color: $core-text-annotation
    border-width:1px
    width: 400px
    outline: none
    
  .search-box, textarea
    padding-left: 10px
    padding-right: 26px
    background-color: $core-bg-canvas
    
  .close-icon
    border:1px solid transparent
    background-color: transparent
    display: inline-block
    vertical-align: middle
    outline: none
    cursor: pointer
    right: 35px
    
  .close-icon:after
    content: 'X'
    display: block
    width: 15px
    height: 15px
    position: absolute
    background-color: $core-text-annotation
    z-index:1
    top: -8px
    bottom: none
    margin: auto
    padding: 3px
    border-radius: 50%
    text-align: center
    color: white
    font-weight: normal
    font-size: 12px
    cursor: pointer

  .search-box:not(:valid) ~ .close-icon
    display: none

</style>
