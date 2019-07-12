<template>

  <span>
    <!-- eslint-disable -->
    <a :href="href" target="_blank">{{ text }}<mat-svg category="action" name="open_in_new" class="pop" /></a>
    <!-- eslint-enable -->
  </span>

</template>


<script>

  export default {
    name: 'ExternalLink',
    props: {
      text: {
        type: String,
        required: true,
      },
      href: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .pop {
    display: inline-block;
    width: 16px;
    margin-left: 2px;
    vertical-align: text-top;
  }

</style>
