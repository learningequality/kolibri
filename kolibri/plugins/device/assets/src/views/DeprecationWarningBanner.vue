<template>

  <div
    v-show="showBanner"
    class="alert"
    :style="{ backgroundColor: $themePalette.yellow.v_200 }"
  >
    <div style="display:flex">
      <div>
        <KIcon
          icon="warning"
          class="icon"
          :color="$themePalette.yellow.v_1100"
        />
      </div>

      <div class="error-message">
        <p v-if="py27Deprecated">
          {{ coreString('pythonSupportWillBeDropped') }}
        </p>
        <p v-if="currentUserOnIE11">
          {{ coreString('currentDeviceUsingIE11') }}
        </p>
        <p v-if="userDevicesUsingIE11">
          {{ coreString('userDevicesUsingIE11') }}
        </p>
        <p v-if="currentUserOnIE11 || userDevicesUsingIE11">
          {{ coreString('browserSupportWillBeDroppedIE11') }}
        </p>
      </div>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { browser } from 'kolibri.utils.browserInfo';
  import plugin_data from 'plugin_data';

  export default {
    name: 'DeprecationWarningBanner',
    mixins: [commonCoreStrings],
    computed: {
      showBanner() {
        return this.currentUserOnIE11 || this.userDevicesUsingIE11 || this.py27Deprecated;
      },
      userDevicesUsingIE11() {
        return plugin_data.deprecationWarnings.ie11;
      },
      py27Deprecated() {
        return plugin_data.deprecationWarnings.py27;
      },
      currentUserOnIE11() {
        return browser.name === 'IE';
      },
    },
  };

</script>


<style scoped>
.alert {
  position: relative;
  padding-left: 2em;
  margin: 1em auto 0;
  max-width: 1000px;
  width: 100%;
}
.icon {
  height: 24px;
  width: 24px;
  top: 1em;
  left: 1em;
  position: absolute;
}
.error-message {
  font-size:14px;
  margin: 0em 1em 0 2em;
}
</style>
