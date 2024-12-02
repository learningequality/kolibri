<template>

  <li>
    <span
      class="divider"
      :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
    >
    </span>
  </li>

</template>


<script>

  export default {
    name: 'SideNavDivider',
  };

</script>


<style lang="scss" scoped>

  .divider {
    display: block;
    min-width: 100%;
    height: 1px;
    margin: 8px 0;
    overflow-y: hidden;
  }

</style>
