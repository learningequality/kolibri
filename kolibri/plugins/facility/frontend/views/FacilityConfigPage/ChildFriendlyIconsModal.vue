<template>

  <KModal
    :title="childFriendlyIcons$()"
    :submitText="coreString('closeAction')"
    @submit="$emit('close')"
    @cancel="$emit('close')"
  >
    <p>{{ childFriendlyIconsInfoDescription$() }}</p>
    <div class="icon-grids">
      <div class="icon-grid-column">
        <p class="icon-grid-label">
          {{ childFriendlyIconsColumnLabel$() }}
        </p>
        <div class="icon-grid">
          <div
            v-for="icon in allIcons"
            :key="icon.iconColorful"
            class="icon-item"
            role="img"
            :aria-label="getIconLabel(icon.name)"
          >
            <KIcon
              :icon="icon.iconColorful"
              class="icon"
            />
          </div>
        </div>
      </div>
      <div class="icon-grid-column">
        <p class="icon-grid-label">
          {{ standardIconsColumnLabel$() }}
        </p>
        <div class="icon-grid">
          <div
            v-for="icon in allIcons"
            :key="icon.iconStandard"
            class="icon-item"
            role="img"
            :aria-label="getIconLabel(icon.name)"
          >
            <KIcon
              :icon="icon.iconStandard"
              class="icon"
            />
          </div>
        </div>
      </div>
    </div>
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { PICTURE_PASSWORD_SET } from 'kolibri/constants';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  export default {
    name: 'ChildFriendlyIconsModal',
    setup() {
      const {
        childFriendlyIcons$,
        childFriendlyIconsInfoDescription$,
        childFriendlyIconsColumnLabel$,
        standardIconsColumnLabel$,
      } = picturePasswordStrings;

      const allIcons = Object.values(PICTURE_PASSWORD_SET);

      function getIconLabel(name) {
        return picturePasswordStrings[`${name}$`]();
      }

      return {
        coreString,
        allIcons,
        getIconLabel,
        childFriendlyIcons$,
        childFriendlyIconsInfoDescription$,
        childFriendlyIconsColumnLabel$,
        standardIconsColumnLabel$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .icon-grids {
    display: flex;
    gap: 24px;
    margin-top: 32px;
  }

  .icon-grid-column {
    flex: 1;
  }

  .icon-grid-label {
    margin: 0 0 8px;
    font-weight: bold;
    text-align: center;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .icon-item {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon {
    width: 48px;
    height: 48px;
  }

</style>
