<template>

  <div>
    {{ $tr('versionAvailable', { version }) }}
    <KButton :text="$tr('viewChangesAction')" />
  </div>

</template>


<script>

  export default {
    name: 'NewChannelVersionBanner',
    components: {},
    props: {
      version: {
        type: Number,
      },
    },
    $trs: {
      versionAvailable: 'Version {version} is available',
      viewChangesAction: 'View changes',
    },
  };

</script>


<style lang="scss" scoped></style>
