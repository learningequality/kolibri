<template>

  <div class="bottom-bar">
    <div class="bottom-bar-heading">
      <h3 v-if="heading">{{ heading }}</h3>
    </div>
    <div class="d-t">
      <div class="d-t-r">
        <div class="d-t-c bottom-bar-progress-container">
          <div class="bottom-bar-progress">
            {{ $tr('progress', { progress: sliderValue / 100 }) }}
          </div>
        </div>
        <div class="d-t-c full-width">
          <input
            class="full-width"
            type="range"
            :min="0"
            :max="100"
            :step="sliderStep"
            :value="sliderValue"
            :aria-label="$tr('jumpToPositionInBook')"
            @change="handleChange($event.target.value)"
          >
        </div>
      </div>
    </div>

  </div>

</template>


<script>

  export default {
    name: 'BottomBar',
    $trs: {
      progress: `{progress, number, percent}`,
      jumpToPositionInBook: 'Jump to position in book',
    },
    props: {
      heading: {
        type: String,
        required: false,
      },
      sliderValue: {
        type: Number,
        required: true,
      },
      sliderStep: {
        type: Number,
        required: true,
      },
    },
    methods: {
      handleChange(newValue) {
        this.$emit('sliderChanged', Number(newValue));
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './EpubStyles';

  .bottom-bar {
    height: 54px;
    padding: 8px 8px 0;
    background-color: $core-grey-200;
    box-shadow: $epub-box-shadow;
  }

  .bottom-bar-heading {
    height: 17px;
    h3 {
      @include truncate-text;

      margin: 0 0 4px;
      text-align: center;
    }
  }

  .full-width {
    width: 100%;
  }

  .bottom-bar-progress-container {
    padding-right: 8px;
    margin: 0;
    vertical-align: middle;
  }

  .bottom-bar-progress {
    width: 35px;
  }

  .d-t {
    @include d-t;
  }

  .d-t-r {
    @include d-t-r;
  }

  .d-t-c {
    @include d-t-c;
  }

</style>
