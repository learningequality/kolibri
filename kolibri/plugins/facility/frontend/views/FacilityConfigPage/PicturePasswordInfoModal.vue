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

    <!-- eslint-disable vue/no-bare-strings-in-template kolibri/vue-component-class-name-casing -->
    <!-- Static illustration of the picture password grid UI -->
    <div
      class="illustration-wrapper"
      aria-hidden="true"
    >
      <div class="illustration-card">
        <div class="pp-grid">
          <div class="pp-cell"></div>
          <div
            class="pp-cell pp-cell-selected"
            :style="{ borderColor: $themeTokens.primary }"
          >
            <span
              class="pp-badge"
              :style="{ backgroundColor: $themeTokens.primary }"
            >1</span>
          </div>
          <div class="pp-cell"></div>
          <div
            class="pp-cell pp-cell-selected"
            :style="{ borderColor: $themeTokens.primary }"
          >
            <span
              class="pp-badge"
              :style="{ backgroundColor: $themeTokens.primary }"
            >2</span>
          </div>
          <div class="pp-cell"></div>
          <div class="pp-cell"></div>
          <div class="pp-cell"></div>
          <div class="pp-cell"></div>
          <div class="pp-cell"></div>
        </div>
        <div class="pp-action-row">
          <div class="pp-progress">
            <div class="pp-dot"></div>
            <div class="pp-dot"></div>
            <div class="pp-dash"></div>
          </div>
          <div class="pp-submit">
            <span class="pp-arrow">&#8594;</span>
          </div>
        </div>
      </div>
    </div>
    <!-- eslint-enable vue/no-bare-strings-in-template kolibri/vue-component-class-name-casing -->
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

      return {
        coreString,
        picturePassword$,
        picturePasswordInfoIntro$,
        picturePasswordInfoBody$,
        picturePasswordInfoNote$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .illustration-wrapper {
    display: flex;
    justify-content: center;
    padding: 24px;
    margin-top: 8px;
    background-color: #666666;
    border-radius: 8px;
  }

  .illustration-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 220px;
    padding: 16px;
    background-color: #ffffff;
    border-radius: 8px;
  }

  .pp-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .pp-cell {
    height: 48px;
    background-color: #e0e0e0;
    border: 2px solid transparent;
    border-radius: 8px;
  }

  .pp-cell-selected {
    position: relative;
    background-color: #dceeff;
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
    color: #ffffff;
    border-radius: 50%;
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
    background-color: #f0f0f0;
    border-radius: 6px;
  }

  .pp-dot {
    width: 12px;
    height: 12px;
    background-color: #b0b0b0;
    border-radius: 50%;
  }

  .pp-dash {
    flex: 1;
    height: 4px;
    background-color: #d0d0d0;
    border-radius: 4px;
  }

  .pp-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #d0d0d0;
    border-radius: 6px;
  }

  .pp-arrow {
    font-size: 18px;
    color: #888888;
  }

</style>
