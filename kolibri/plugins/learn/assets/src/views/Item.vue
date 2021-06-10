<template>

  <div class="container">
    <!-- TODO replace placeholder with new LearningActivityIcon component -->
    <KIcon
      icon="video"
      class="icon"
    />
    <span class="text">
      <p class="title">{{ title }}</p>
      <p class="estimated-time">{{ duration }}</p>
    </span>
    <span class="progress">
      <!-- TODO replace placeholder with new LearningActivityIcon component -->
      {{ displayProgress }}
      <KIcon
        icon="star"
        class="icon"
      />
    </span>
  </div>
  <!-- placeholder for learning activity type chips TODO update with chip component -->

</template>


<script>

  // import { validateContentNodeKind, validateLinkObject } from 'kolibri.utils.validators';

  export default {
    name: 'Item',
    props: {
      title: {
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
      //   link: {
      //     type: Object,
      //     required: true,
      //     validator: validateLinkObject,
      //   },
    },
    computed: {
      displayProgress() {
        if (this.progress === 0) {
          return 'not started';
        } else if (this.progress > 0 && this.progress < 1) {
          return 'mini progress bar';
        } else if (this.progress >= 1) {
          return 'completed';
        }
        return null;
      },
    },
  };

</script>


<style scoped>

  .container {
    height: 100px;
    padding-top: 27px;
    position: relative;
  }

  .container:hover {
    background: light-gray;
  }

  .icon {
    vertical-align: top;
    margin-top: 11px;
    width: 33px;
    height: 33px;
  }

  .text {
    display: inline-block;
    padding-left: 17px;
  }

  .title {
    margin-bottom: 0;
  }

  .estimated-time {
    color: gray;
    margin-top: 7px;
  }

  .progress {
    display: inline;
    position: fixed;
    /* top: 22px; */
    right: 56px;
  }

</style>
