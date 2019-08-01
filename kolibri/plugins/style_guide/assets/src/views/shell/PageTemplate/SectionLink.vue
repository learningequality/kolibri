<template>

  <router-link :id="anchorId" :to="to">
    <file-svg class="icon-link" src="./link.svg" />
    <span class="visuallyhidden">link to section</span>
  </router-link>

</template>


<script>

  export default {
    name: 'SectionLink',
    props: {
      to: {
        type: String,
        validator(value) {
          return value.match(/^#[a-zA-Z0-9_-]*$/);
        },
      },
    },
    computed: {
      anchorId() {
        return this.to.replace('#', '');
      },
    },
  };

</script>


<style lang="scss" scoped>

  .icon-link {
    width: 14px;
    height: 14px;
    margin-right: 8px;
    margin-left: 8px;
  }

</style>
