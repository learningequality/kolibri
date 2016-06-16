<template>

  <core-base>
    <breadcrumbs
      :crumbs="breadcrumbs.crumbs"
      :current="breadcrumbs.current">
    </breadcrumbs>
    <main>
      <h2>Topics</h2>
      <ul>
        <li v-for="topic in topics">
          <topic-card
            :title="topic.title"
            :linkhref="topic.description"
            :ntotal="topic.n_total"
            :ncomplete="topic.n_complete"
          >
          </topic-card>
        </li>
      </ul>
      <h2>Content</h2>
      <content-cards :contentcards="contentCards.cards"></content-cards>
    </main>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'breadcrumbs': require('./breadcrumbs'),
      'content-cards': require('./content-cards'),
      'topic-card': require('./topic-card'),
    },
    data: () => ({
      breadcrumbs: require('./demo/breadcrumbs.json'),
      contentCards: require('./demo/content-cards.json'),
      topics: require('./demo/graphing__topics_only.json'),
    }),
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
