<template>

  <div class="bottom-bar">
    <h3 class="bottom-bar-heading">{{ heading }}</h3>
    <div class="d-t">
      <div class="d-t-r">
        <div class="d-t-c progress-container">
          <div class="progress">
            {{ $tr('progress', { progress: sliderValue / 100 }) }}
          </div>
        </div>
        <div class="d-t-c full-width">
          <input
            class="full-width"
            type="range"
            :min="sliderMin"
            :max="sliderMax"
            :step="sliderStep"
            :value="sliderValue"
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

    computed: {
      sliderMin() {
        return 0;
      },
      sliderMax() {
        return 100;
      },
    },
    watch: {
      sliderValue(newValue) {
        console.log('sliderValue changed from parent to ', newValue);
      },
    },
    methods: {
      handleChange(newValue) {
        console.log('user changed slider to', newValue);
        this.$emit('sliderChanged', Number(newValue));
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './epub';

  .bottom-bar {
    height: 54px;
    padding: 8px 8px 0;
    font-size: smaller;
    background-color: $core-grey-200;
    box-shadow: $epub-box-shadow;
  }

  .slider {
    width: 100%;
  }

  .bottom-bar-heading {
    height: 17px;
    margin: 0 0 4px;
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .d-t {
    display: table;
  }

  .d-t-r {
    display: table-row;
  }

  .d-t-c {
    display: table-cell;
  }

  .full-width {
    width: 100%;
  }

  .progress-container {
    padding-right: 8px;
    margin: 0;
    vertical-align: middle;
  }

  .progress {
    width: 35px;
  }

</style>
