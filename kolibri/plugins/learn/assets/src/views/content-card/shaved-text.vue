<template>

  <div :title="tooltip">{{ title }}</div>

</template>


<script>

  import shave from 'shave';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';

  export default {
    name: 'shavedText',
    mixins: [responsiveElement],
    props: {
      title: {
        type: String,
        required: true,
      },
      maxHeight: {
        type: Number,
        required: true,
        validator(value) {
          return value > 0;
        },
      },
    },
    data() {
      return {
        hasTooltip: false,
      };
    },
    computed: {
      tooltip() {
        if (!this.hasTooltip) {
          return null;
        }
        return this.title;
      },
    },
    watch: {
      elSize: {
        handler() {
          shave(this.$el, this.maxHeight);
          this.$nextTick(() => {
            this.hasTooltip = Boolean(this.$el.querySelector('.js-shave'));
          });
        },
        deep: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
