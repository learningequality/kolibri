<template>

  <svg v-if="kind=='topic'" class="content-icon" src="./content-icons/topic.svg"></svg>
  <svg v-if="kind=='video'" class="content-icon" src="./content-icons/video.svg"></svg>
  <svg v-if="kind=='audio'" class="content-icon" src="./content-icons/audio.svg"></svg>
  <svg v-if="kind=='document'" class="content-icon" src="./content-icons/document.svg"></svg>
  <svg v-if="kind=='exercise'" class="content-icon" src="./content-icons/exercise.svg"></svg>

</template>


<script>

  const ContentKinds = require('kolibri.coreVue.vuex.constants').ContentKinds;

  module.exports = {
    $trNameSpace: 'learn',
    $trs: {
      topic: 'topic',
      video: 'video',
      audio: 'audio',
      document: 'document',
      exercise: 'exercise',
    },
    props: {
      size: {
        type: Number,
        default: 30,
      },
      progress: {
        type: Number,
        default: 0.0,
        validator(value) {
          return (value >= 0.0) && (value <= 1.0);
        },
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          for (const contentKind in ContentKinds) {
            if (ContentKinds[contentKind] === value) {
              return true;
            }
          }
          return false;
        },
      },
    },
    computed: {
      /*      altText() {
       return `${this.progress} - ${this.$tr(this.kind)}`;
       },
       progressPercent() {
       let progressPercent = Math.floor(this.progress * 100);
       // Due to rounding error
       if (progressPercent === 100) {
       progressPercent = 101;
       }
       return progressPercent;
       },*/
      source() {
        this.whatAmI();
        return `./content-icons/${this.kind}.svg`;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .content-icon
    width: 100%
    height: 100%
    fill: $core-action-normal

</style>
