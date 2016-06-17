<template>

  <a class="topic-card" href="{{linkhref}}">
    <p>
      {{ ncomplete }} / {{ ntotal }}
    </p>
    <img class="topic-card-folder" src="http://simpleicon.com/wp-content/uploads/folder-2.png">
    <p>{{ title }}</p>
  </a>

</template>


<script>

  module.exports = {
    props: [
      'title',
      'linkhref',
      'ntotal',
      'ncomplete',
    ],
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .topic-card
    display: block
    height: 150px
    width: 200px
    text-align: center
    background-color: $core-bg-light

  .topic-card-folder
    max-width: 50px

  p
    margin-top: 5px

</style>
