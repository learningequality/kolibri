<template>

  <div>
    {{ $tr('versionAvailable', { version }) }}
    <KButton :text="$tr('seeWhatsNewAction')" />
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
      versionAvailable: 'Version {version} is available!',
      seeWhatsNewAction: `See what's new`,
    },
  };

</script>


<style lang="scss" scoped></style>
