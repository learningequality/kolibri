<template>

  <nav class="breadcrumbs">
    <span v-for="crumb in crumbs">
      <a :href="crumb.url">{{ crumb.name }} </a> /
    </span>
    <span>
      {{ current }}
    </span>
  </nav>

</template>


<script>

  module.exports = {
    props: ['crumbs', 'current'],
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
