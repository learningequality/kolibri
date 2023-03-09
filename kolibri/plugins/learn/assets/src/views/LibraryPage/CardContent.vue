<template>

  <div
    class="card-main-wrapper"
    :style="cardStyle"
  >
    <div class="" style="width:250px;height:250px;">
      <div class="card-body">
        <div class="explore">
          {{ body }}
        </div>
        <div class="side-icon">
          <KIcon icon="wifi" />
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';

  export default {
    name: 'CardContent',
    components: {},
    setup() {
      const { windowBreakpoint, windowGutter } = useKResponsiveWindow();
      return {
        windowBreakpoint,
        windowGutter,
      };
    },
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

  .side-icon {
    margin-top: 220px;
    text-align: right;
  }

  .explore {
    margin-top: 120px;
    font-size: 25px;
    font-weight: bold;
    text-align: center;
  }

  .card-body {
    width: 100%;
  }

</style>
