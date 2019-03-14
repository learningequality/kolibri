<template>

  <div
    class="hr-line"
    :style="marginStyles"
  ></div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'KHorizontalRule',
    mixins: [responsiveWindow],
    props: {
      parentMargin: {
        type: Number,
        required: false,
      },
    },
    computed: {
      marginStyles() {
        if (this.parentMargin !== undefined) {
          return {
            marginLeft: `${-this.parentMargin}px`,
            marginRight: `${-this.parentMargin}px`,
          };
        }
        if (this.windowIsSmall) {
          return {
            marginLeft: '-16px',
            marginRight: '-16px',
          };
        }
        return {
          marginLeft: '-24px',
          marginRight: '-24px',
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .hr-line {
    margin-top: 16px;
    margin-bottom: 16px;
    border-top: 1px solid #dedede;
  }

</style>
