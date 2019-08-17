<template>

  <div class="bottom-bar" :style="{ backgroundColor: $themePalette.grey.v_200 }">
    <div class="bottom-bar-heading">
      <h3 v-if="heading">
        {{ heading }}
      </h3>
    </div>
    <transition mode="in-out">
      <div v-if="locationsAreReady">
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
      <div
        v-else
        class="loader-container"
      >
        <KLinearLoader
          type="indeterminate"
          :delay="false"
          class="loader"
        />
        <span>{{ $tr('preparingSlider') }}</span>
      </div>
    </transition>
  </div>

</template>


<script>

  export default {
    name: 'BottomBar',
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
      locationsAreReady: {
        type: Boolean,
        required: true,
      },
    },
    methods: {
      handleChange(newValue) {
        this.$emit('sliderChanged', Number(newValue));
      },
    },
    $trs: {
      progress: `{progress, number, percent}`,
      jumpToPositionInBook: 'Jump to position in book',
      preparingSlider: 'Preparing slider',
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .bottom-bar {
    height: 54px;
    padding: 8px 8px 0;
    overflow: hidden;
    text-align: center;
  }

  .bottom-bar-heading {
    height: 17px;
    margin-bottom: 4px;
    h3 {
      @include truncate-text;

      margin: 0;
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

  .loader-container {
    font-size: smaller;
  }

  .loader {
    width: 200px;
    max-width: 100%;
    margin: 0 auto;
  }

</style>
