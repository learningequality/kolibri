<template>

  <div class="prev-next-bar">
    <!-- Prev button on the left -->
    <KButton
      class="btn-flex"
      appearance="raised-button"
      data-testid="prev-button"
      :disabled="!canGoPrev"
      :aria-label="previousLabel$()"
      :text="showButtonLabels ? previousLabel$() : ''"
      @click="handlePrev"
    >
      <template #icon>
        <KIcon
          icon="back"
          class="btn-icon"
          :color="$themeTokens.text"
        />
      </template>
    </KButton>

    <!-- Progress/status in the center -->
    <div
      v-if="progressLabel"
      class="progress-area"
      data-testid="progress-area"
    >
      {{ progressLabel }}
    </div>

    <!-- Actions slot + Next button on the right -->
    <div class="right-area">
      <div
        v-if="$slots.actions"
        class="actions-area"
        data-testid="actions-area"
      >
        <slot name="actions"></slot>
      </div>
      <KButton
        primary
        class="btn-flex"
        data-testid="next-button"
        :disabled="!canGoNext"
        :aria-label="nextLabel$()"
        :text="showButtonLabels ? nextLabel$() : ''"
        @click="handleNext"
      >
        <template #iconAfter>
          <KIcon
            class="btn-icon hotfixed"
            icon="forward"
            :color="$themeTokens.textInverted"
          />
        </template>
      </KButton>
    </div>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';

  export default {
    name: 'PrevNextBar',
    setup(props, { emit }) {
      const { windowBreakpoint } = useKResponsiveWindow();
      const { previousLabel$, nextLabel$ } = coursesStrings;

      const canGoPrev = computed(() => {
        if (props.prevEnabled !== null) {
          return props.prevEnabled;
        }
        return props.currentNumber > 1;
      });

      const canGoNext = computed(() => {
        if (props.nextEnabled !== null) {
          return props.nextEnabled;
        }
        return props.currentNumber < props.totalNumber;
      });

      // Show text labels on buttons for breakpoints > 0
      const showButtonLabels = computed(() => windowBreakpoint.value > 0);

      function handlePrev() {
        if (canGoPrev.value) {
          emit('prev');
        }
      }

      function handleNext() {
        if (canGoNext.value) {
          emit('next');
        }
      }

      return {
        canGoPrev,
        canGoNext,
        showButtonLabels,
        previousLabel$,
        nextLabel$,
        handlePrev,
        handleNext,
      };
    },
    props: {
      currentNumber: {
        type: Number,
        default: 1,
      },
      totalNumber: {
        type: Number,
        default: 1,
      },
      progressLabel: {
        type: String,
        default: '',
      },
      /**
       * Override default behavior of enabling/disabling prev button based on currentNumber.
       */
      prevEnabled: {
        type: Boolean,
        default: null,
      },
      /**
       * Override default behavior of enabling/disabling next button based on currentNumber
       */
      nextEnabled: {
        type: Boolean,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../buttons';

  .prev-next-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
  }

  .progress-area {
    font-size: 14px;
    text-align: center;
  }

  .right-area {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .actions-area {
    display: flex;
    align-items: center;
  }

  .btn-flex {
    @include btn-flex;
  }

</style>
