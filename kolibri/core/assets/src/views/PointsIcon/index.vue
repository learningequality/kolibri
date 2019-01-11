<template>

  <div>
    <file-svg v-if="active" src="./icons/leaf.svg" />
    <file-svg v-else src="./icons/grey-leaf.svg" />
  </div>

</template>


<script>

  export default {
    name: 'PointsIcon',
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>
