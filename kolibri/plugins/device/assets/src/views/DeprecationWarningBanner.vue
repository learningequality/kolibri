<template>

  <div
    v-show="userDevicesUsingIE11"
    class="alert"
    :style="{ backgroundColor: $themePalette.yellow.v_100 }"
  >
    <div style="display: flex">
      <div>
        <KIcon
          icon="warning"
          class="icon"
          :color="$themePalette.yellow.v_600"
        />
      </div>

      <div class="error-message">
        <p>
          {{ coreString('userDevicesUsingIE11') }}
        </p>
        <p>
          {{ coreString('browserSupportDroppedIE11') }}
        </p>
      </div>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import plugin_data from 'kolibri-plugin-data';

  export default {
    name: 'DeprecationWarningBanner',
    mixins: [commonCoreStrings],
    computed: {
      userDevicesUsingIE11() {
        return plugin_data.deprecationWarnings.ie11;
      },
    },
  };

</script>


<style scoped>

  .alert {
    position: relative;
    width: 100%;
    max-width: 1000px;
    padding-left: 2em;
    margin: 1em auto 0;
  }

  .icon {
    position: absolute;
    top: 1em;
    left: 1em;
    width: 24px;
    height: 24px;
  }

  .error-message {
    margin: 0 1em 0 2em;
    font-size: 14px;
  }

</style>
