<template>

  <div
    class="header-container"
    :class="{ 'header-container--sticky': isHeaderSticky, 'header-sm': windowIsSmall }"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <div class="inner-header" :style="innerStyle">
      <div class="overall-status" :style="{ color: $themeTokens.text }">
        <KIcon
          icon="mastered"
          :color="success ? $themeTokens.mastered : $themePalette.grey.v_200"
        />
        <div class="overall-status-text">
          <span v-if="success" class="completed" :style="{ color: $themeTokens.annotation }">
            {{ coreString('completedLabel') }}
          </span>
          <span>
            {{ $tr('goal', { count: totalCorrectRequiredM }) }}
          </span>
        </div>
      </div>
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'LessonMasteryBar',
    mixins: [responsiveWindowMixin],
    props: {
      maxWidth: {
        type: Number,
        default: 960,
      },
    },
    data() {
      return {
        scrollY: null,
        headerTop: 0,
        isHeaderSticky: false,
      };
    },
    computed: {
      innerStyle() {
        if (this.maxWidth) {
          return { maxWidth: `${this.maxWidth}px` };
        }
        return null;
      },
    },
    watch: {
      scrollY(newValue) {
        if (newValue > this.headerTop) {
          this.isHeaderSticky = true;
        } else {
          this.isHeaderSticky = false;
        }
      },
    },
    mounted() {
      window.addEventListener('load', () => {
        window.addEventListener('scroll', () => {
          this.scrollY = Math.round(window.scrollY);
        });
        this.headerTop = this.$refs.header.getBoundingClientRect().top;
      });
    },
    methods: {},

    $trs: {
      goal: {
        message: 'Get {count, number, integer} {count, plural, other {correct}}',
        context:
          '\nMessage that indicates to the learner how many correct answers they need to give in order to master the given topic, and for the exercise to be considered completed.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .header-container {
    position: fixed;
    right: 0;
    left: 0;
    z-index: 8; // material - Bottom app bar
    height: 63px;
    padding: 8px 16px;
    margin: 0;
    overflow-x: hidden;
    font-size: 14px;
    border: 1px red solid;
  }

  .header-sm {
    height: auto;
    min-height: 72px;
  }

  .inner-header {
    height: 100%;
    padding: 10px 0;
    margin: auto;
  }

</style>
