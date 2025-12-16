<template>

  <div
    class="bottom-bar"
    :style="{ backgroundColor: $themePalette.grey.v_300 }"
  >
    <div class="bottom-bar-heading">
      <h3 v-if="heading">
        {{ heading }}
      </h3>
    </div>
    <transition mode="in-out">
      <div v-if="locationsAreReady">
        <div class="d-t">
          <div class="d-t-r">
            <div class="bottom-bar-progress-container d-t-c">
              <div class="bottom-bar-progress">
                {{ $formatNumber(sliderValue / 100, { style: 'percent' }) }}
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
        default: null,
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
      jumpToPositionInBook: {
        message: 'Jump to position in book',
        context:
          'To read digital books in Kolibri learners have several available controls inside the reader.\n\nOne of them allows the learner to access a specific page in the book using the slider control bar at the bottom of the screen.',
      },
      preparingSlider: {
        message: 'Preparing slider',
        context:
          "The slider option is a bar that appears at the bottom of the EPUB reader which allows learners to navigate the pages of the book they're reading. This message appears when the slider is loading.",
      },
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
