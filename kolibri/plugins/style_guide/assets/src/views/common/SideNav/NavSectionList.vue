<template>

  <div>
    <div class="hr-line"></div>
    <div class="section-heading">
      {{ title }}
    </div>
    <ul>
      <slot></slot>
    </ul>
  </div>

</template>


<script>

  export default {
    name: 'NavSectionList',
    props: {
      title: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  ul {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  .hr-line {
    margin-top: 16px;
    // margin-right: -8px;
    margin-bottom: 16px;
    // margin-left: -8px;
    border-top: 1px solid #dedede;
  }

  .section-heading {
    margin-bottom: 8px;
    font-size: smaller;
    color: #777777;
  }

</style>
