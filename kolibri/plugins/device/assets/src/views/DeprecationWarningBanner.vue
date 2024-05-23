<template>

  <div
    v-show="userDevicesUsingIE11"
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import plugin_data from 'plugin_data';

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
