<template>

  <nav>
    <span v-for="crumb in crumbs">
      <a :href="crumb.url">{{ crumb.name }} </a> /
    </span>
    <span class="current">
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

  .current
    font-weight: bold
    color: $core-text-annotation

</style>
