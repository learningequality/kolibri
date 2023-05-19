<template>

  <div class="alert" :style="{ backgroundColor: $themePalette.red.v_50, display: displayBanner }">
    <h1 style="display: none">
      {{ "was insufiicientstorage header" }}
    </h1>
    <div style="display:flex">
      <div>
        <KIcon
          icon="warn"
          class="icon"
        />
      </div>

      <div class="error-message">
        {{ "warning" }}
        <router-link :to="url">
          <KButton appearance="basic-link">
            {{ "link ? button?" }}
          </KButton>
        </router-link>
      </div>

      <div>
        <!-- TODO update aria-labels -->
        <KIconButton
          size="small"
          icon="incorrect"
          :ariaLabel="'arialabel'"
          :tooltip="'tooltip'"
          @click="closeAlert"
        />
      </div>

    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeprecationWarningBanner',
    mixins: [commonCoreStrings],
    data: function() {
      return {
        displayBanner: 'auto',
      };
    },
  };

</script>


<style scoped>
.alert {
  padding: 10px;
  margin-bottom: 15px;
}
.icon {
  height: 24px;
  width: 24px;
  margin-top: 3px;
}
.error-message {
  font-size:14px;
  margin: 7px 7px 0px 10px;
}
</style>
