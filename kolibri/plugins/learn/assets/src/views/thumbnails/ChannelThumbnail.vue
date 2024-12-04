<template>

  <span class="channel-thumbnail">
    <!--
      we consider thumbnails decorative - empty `alt`
      attribute to hide it from screen readers
    -->
    <img
      v-if="thumbnailUrl"
      class="image"
      :src="thumbnailUrl"
      alt=""
      loading="lazy"
    >
  </span>

</template>


<script>

  export default {
    name: 'ChannelThumbnail',
    props: {
      thumbnailUrl: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .channel-thumbnail {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
  }

  .image {
    flex-shrink: 0; // IE fix
    align-self: center;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 100%;
  }

</style>
