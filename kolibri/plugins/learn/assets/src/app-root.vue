<template>

  <core-base>
    <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>
    <main>
      <h2>Topics</h2>
      <ul>
        <li>Topic Card</li>
        <li>Topic Card</li>
        <li>Topic Card</li>
        <li>Topic Card</li>
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
    },
    data: () => ({
      breadcrumbs: require('./demo/breadcrumbs.json'),
      contentCards: require('./demo/content-cards.json'),
    }),
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
