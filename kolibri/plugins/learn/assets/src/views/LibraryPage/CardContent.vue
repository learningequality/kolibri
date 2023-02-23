<template>

  <div
    class="card-main-wrapper"
    :style="cardStyle"
  >
    <div class="" style="width:250px;height:250px;text-align:center;margin-top:80px">
      <h2>
        {{ body }}
      </h2>
    </div>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'CardContent',
    components: {},
    mixins: [responsiveWindowMixin],
    props: {
      body: {
        type: String,
        required: false,
        default: null,
      },
    },

    computed: {
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          marginBottom: `${this.windowGutter}px`,
          minHeight: `${this.overallHeight}px`,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../HybridLearningContentCard/card';

  $margin: 24px;

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-flex;
    width: 100%;
    max-height: 258px;
    padding-bottom: $margin;
    text-decoration: none;
    vertical-align: top;
    border-radius: $radius;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .cardgroup .card-main-wrapper {
    display: inline-flex;
  }

</style>
