<template>

  <div>
    <span ref="text">Hover me</span>
    <KTooltip
      reference="text"
      :refs="$refs"
    >
      Content of tooltip.
    </KTooltip>

  </div>

</template>


<script>

  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'Example',
    components: {
      KTooltip,
    },
  };

</script>
