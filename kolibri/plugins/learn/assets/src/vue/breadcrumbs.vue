<template>

  <nav class="breadcrumbs">
    <span class="parent" v-for="crumb in crumbs">
      <a :href="crumb.url">{{ crumb.name | capitalize }} </a> /
    </span>
    <span class="child">
      {{ current | capitalize }}
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

  .parent , a
    color: $core-text-annotation

  .child
    color: $core-text-default
    font-weight: 700

</style>
