<template>

  <KModal
    :title="picturePassword$()"
    :submitText="coreString('closeAction')"
    @submit="$emit('close')"
    @cancel="$emit('close')"
  >
    <p>{{ picturePasswordInfoIntro$() }}</p>
    <p>{{ picturePasswordInfoBody$() }}</p>
    <p>{{ picturePasswordInfoNote$() }}</p>

    <div
      class="illustration-wrapper"
      :style="{ backgroundColor: $themePalette.grey.v_700 }"
      aria-hidden="true"
    >
      <div
        class="illustration-card"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <div class="pp-grid">
          <div
            v-for="(cell, index) in gridCells"
            :key="index"
            :class="['pp-cell', { 'pp-cell-selected': cell.step }]"
            :style="
              cell.step
                ? { borderColor: $themeTokens.primary, backgroundColor: $themeBrand.primary.v_100 }
                : { backgroundColor: $themePalette.grey.v_200 }
            "
          >
            <span
              v-if="cell.step"
              class="pp-badge"
              :data-step="cell.step"
              :style="{ backgroundColor: $themeTokens.primary, color: $themeTokens.textInverted }"
            ></span>
          </div>
        </div>
        <div class="pp-action-row">
          <div
            class="pp-progress"
            :style="{ backgroundColor: $themeTokens.surface }"
          >
            <div
              class="pp-dot"
              :style="{ backgroundColor: $themeTokens.annotation }"
            ></div>
            <div
              class="pp-dot"
              :style="{ backgroundColor: $themeTokens.annotation }"
            ></div>
            <div
              class="pp-dash"
              :style="{ backgroundColor: $themeTokens.fineLine }"
            ></div>
          </div>
          <div
            class="pp-submit"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          >
            <KIcon
              icon="forward"
              :style="{ fill: $themeTokens.annotation }"
            />
          </div>
        </div>
      </div>
    </div>
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  export default {
    name: 'PicturePasswordInfoModal',
    setup() {
      const {
        picturePassword$,
        picturePasswordInfoIntro$,
        picturePasswordInfoBody$,
        picturePasswordInfoNote$,
      } = picturePasswordStrings;

      // Indices 1 and 3 are the two selected cells in the illustration (4 rows × 3 cols)
      const gridCells = [{}, { step: '1' }, {}, { step: '2' }, {}, {}, {}, {}, {}, {}, {}, {}];

      return {
        coreString,
        gridCells,
        picturePassword$,
        picturePasswordInfoIntro$,
        picturePasswordInfoBody$,
        picturePasswordInfoNote$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  // Dimensions approximate the picture-password grid UI mockup
  .illustration-wrapper {
    display: flex;
    justify-content: center;
    padding: 24px;
    margin-top: 8px;
    border-radius: 8px;
    outline: 0;
  }

  .illustration-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 220px;
    padding: 16px;
    border-radius: 8px;
  }

  .pp-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .pp-cell {
    height: 48px;
    border: 2px solid transparent;
    border-radius: 8px;
  }

  .pp-cell-selected {
    position: relative;
  }

  .pp-badge {
    position: absolute;
    top: -8px;
    left: -8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 11px;
    font-weight: bold;
    border-radius: 50%;

    &::after {
      color: inherit;
      content: attr(data-step);
    }
  }

  .pp-action-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .pp-progress {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 6px;
  }

  .pp-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .pp-dash {
    flex: 1;
    height: 4px;
    border-radius: 4px;
  }

  .pp-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

</style>
