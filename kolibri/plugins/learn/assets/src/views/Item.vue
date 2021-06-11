<template>

  <div
    class="container"
    :style="{
      backgroundColor: itemIsCurrentContent ? $themePalette.grey.v_100 : ''
    }"
  >
    <!-- TODO replace placeholder with new LearningActivityIcon component -->
    <KIcon
      icon="video"
      class="icon"
    />
    <span class="text">
      <p class="title">{{ title }}</p>
      <p class="estimated-time">{{ duration }}</p>
    </span>
    <div
      v-if="progress > 0 && progress < 1"
      class="progress-bar-wrapper"
      :style="{ backgroundColor: $themePalette.grey.v_200 }"
    >
      <div
        class="progress-bar"
        :style="{
          width: `${progress * 100}%`,
        }"
      >
      </div>
      <!-- TODO ensure new star is what is rendered here, in the correct color-->
      <KIcon
        v-if="progress === 1"
        icon="star"
        class="icon"
      />
    </div>
  </div>

</template>


<script>

  export default {
    name: 'Item',
    props: {
      title: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
      duration: {
        type: String,
        required: true,
      },
      // kind: {
      //   type: String,
      //   required: true,
      //   // validator: validateContentNodeKind,
      // },
      progress: {
        type: Number,
        required: false,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
      },
      currentContent: {
        type: Object,
        required: true,
      },
      //   link: {
      //     type: Object,
      //     required: true,
      //     validator: validateLinkObject,
      //   },
    },
    computed: {
      // displayProgress() {
      //   if (this.progress === 0) {
      //     return 'not started';
      //   } else if (this.progress > 0 && this.progress < 1) {
      //     return 'mini progress bar';
      //   } else if (this.progress >= 1) {
      //     return 'completed';
      //   }
      //   return null;
      // },
      itemIsCurrentContent() {
        return this.id === this.currentContent.id;
      },
    },
  };

</script>


<style scoped>

  .container {
    height: 100px;
    padding-top: 27px;
    position: relative;
    padding-left: 32px;
  }

  .container:hover {
    background-color: rgb(249,249,249);
    padding: -32px;
  }

  .icon {
    vertical-align: top;
    /* margin-top: 11px; */
    width: 33px;
    height: 33px;
  }

  .text {
    display: inline-block;
    padding-left: 17px;
  }

  .title {
    margin: 0;
    padding-top: 2px;
    max-width: 225px;
  }

  .estimated-time {
    color: gray;
    margin-top: 7px;
  }

  .progress-bar-wrapper {
    display: inline;
    position: fixed;
    margin-top: 3px;
    right: 32px;
    width: 77px;
    height: 7px;
    opacity: 0.9;
  }

  .progress-bar {
    height: 100%;
    color: blue;
  }

</style>
