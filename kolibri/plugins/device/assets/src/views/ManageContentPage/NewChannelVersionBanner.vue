<template>

  <div class="new-version-banner">
    <span class="version">
      <KIcon
        class="icon"
        icon="error"
        :style="{fill: $themePalette.lightblue.v_500}"
      />
      {{ $tr('versionAvailable', { version }) }}
    </span>
    <KButton
      :text="$tr('viewChangesAction')"
      appearance="flat-button"
      :primary="true"
    />
  </div>

</template>


<script>

  export default {
    name: 'NewChannelVersionBanner',
    components: {},
    props: {
      version: {
        type: Number,
        required: true,
      },
    },
    $trs: {
      versionAvailable: 'Version {version} is available',
      viewChangesAction: 'View changes',
    },
  };

</script>


<style lang="scss" scoped>

  .new-version-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .icon {
    margin-right: 8px;
  }

  .icon svg {
    width: 24px;
    height: 24px;
  }

</style>
