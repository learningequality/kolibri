<template>

  <div class="sparkline-wrapper">
    <span class="visuallyhidden">
      {{ accessibilityLabel }}
    </span>
    <div
      ref="sparklineBar"
      class="sparkline-bar"
      aria-hidden="true"
    >
      <div
        v-for="(segment, index) in segments"
        :key="segment.key"
        class="segment"
        :class="`segment-${segment.key}`"
        :style="segmentStyle(segment, index)"
      >
        <span
          class="count-text"
          aria-hidden="true"
        >
          {{ segment.count }}
        </span>
      </div>
    </div>
    <KTooltip
      reference="sparklineBar"
      :refs="$refs"
    >
      <div class="tooltip-content">
        <p class="tooltip-title">
          {{ learnersByMasteryLabel$() }}
        </p>
        <div class="tooltip-rows">
          <div class="tooltip-row">
            <span
              class="tooltip-dot"
              :style="{ backgroundColor: dotColors.low }"
            ></span>
            {{ lowCountLabel$({ count: lowCount }) }}
          </div>
          <div class="tooltip-row">
            <span
              class="tooltip-dot"
              :style="{ backgroundColor: dotColors.mid }"
            ></span>
            {{ partialCountLabel$({ count: midCount }) }}
          </div>
          <div class="tooltip-row">
            <span
              class="tooltip-dot"
              :style="{ backgroundColor: dotColors.high }"
            ></span>
            {{ strongCountLabel$({ count: highCount }) }}
          </div>
        </div>
        <p class="tooltip-hint">
          {{ clickToViewDetailsLabel$() }}
        </p>
      </div>
    </KTooltip>
  </div>

</template>


<script>

  import { computed, toRefs } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';

  export const MIN_SEGMENT_WIDTH_PX = 16;

  export default {
    name: 'SparklineBar',
    setup(props) {
      const {
        sparklineDistributionLabel$,
        learnersByMasteryLabel$,
        lowCountLabel$,
        partialCountLabel$,
        strongCountLabel$,
        clickToViewDetailsLabel$,
      } = coursesStrings;
      const { lowCount, midCount, highCount } = toRefs(props);

      const totalCount = computed(() => lowCount.value + midCount.value + highCount.value);

      const accessibilityLabel = computed(() =>
        sparklineDistributionLabel$({
          lowCount: lowCount.value,
          midCount: midCount.value,
          highCount: highCount.value,
        }),
      );

      const separatorColor = themeTokens().surface;
      const segments = computed(() => {
        const palette = themePalette();
        const tokens = themeTokens();
        return [
          {
            key: 'low',
            count: lowCount.value,
            backgroundColor: palette.red.v_600,
            textColor: tokens.textInverted,
          },
          {
            key: 'mid',
            count: midCount.value,
            backgroundColor: palette.yellow.v_500,
            textColor: tokens.text,
          },
          {
            key: 'high',
            count: highCount.value,
            backgroundColor: palette.green.v_600,
            textColor: tokens.textInverted,
          },
        ];
      });

      function widthForCount(count) {
        if (totalCount.value === 0) {
          return 'calc(100% / 3)';
        }
        const proportion = count / totalCount.value;
        const offset = MIN_SEGMENT_WIDTH_PX * 3;
        return `calc(${MIN_SEGMENT_WIDTH_PX}px + ${proportion} * (100% - ${offset}px))`;
      }

      function segmentStyle(segment, index) {
        return {
          width: widthForCount(segment.count),
          backgroundColor: segment.backgroundColor,
          color: segment.textColor,
          boxShadow: index === 0 ? 'none' : `inset 1px 0 0 ${separatorColor}`,
        };
      }

      const dotColors = {
        low: themePalette().red.v_600,
        mid: themePalette().yellow.v_500,
        high: themePalette().green.v_600,
      };

      return {
        accessibilityLabel,
        segments,
        segmentStyle,
        dotColors,
        learnersByMasteryLabel$,
        lowCountLabel$,
        partialCountLabel$,
        strongCountLabel$,
        clickToViewDetailsLabel$,
      };
    },
    props: {
      lowCount: {
        type: Number,
        required: true,
        validator(value) {
          return value >= 0;
        },
      },
      midCount: {
        type: Number,
        required: true,
        validator(value) {
          return value >= 0;
        },
      },
      highCount: {
        type: Number,
        required: true,
        validator(value) {
          return value >= 0;
        },
      },
    },
  };

</script>


<style lang="scss" scoped>

  .visuallyhidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .sparkline-wrapper {
    width: 100%;
  }

  .sparkline-bar {
    display: flex;
    width: 100%;
    height: 20px;
    overflow: hidden;
    border-radius: 2px;
  }

  .segment {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.15s ease;
  }

  .count-text {
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
  }

  .tooltip-content {
    min-width: 160px;
  }

  .tooltip-title {
    margin: 0 0 6px;
    font-weight: 600;
  }

  .tooltip-rows {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }

  .tooltip-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .tooltip-dot {
    display: inline-block;
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .tooltip-hint {
    margin: 8px 0 0;
    font-style: italic;
    opacity: 0.8;
  }

</style>
