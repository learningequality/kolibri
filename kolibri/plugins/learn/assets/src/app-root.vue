<template>

  <core-base>
    Home / Folder A / Folder B
    <main>
      <h2>Topics</h2>
      <ul>
        <li>Topic Card</li>
        <li>Topic Card</li>
        <li>Topic Card</li>
        <li>Topic Card</li>
      </ul>
      <h2>Content</h2>
      <ul>
        <li>Content Card</li>
        <li>Content Card</li>
      </ul>
    </main>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
