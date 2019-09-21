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

  export default {
    name: 'Example',
  };

</script>
