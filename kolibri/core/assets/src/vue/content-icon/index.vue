<template>

  <div>
    <svg v-if="kind=='topic'" class="content-icon" src="./content-icons/topic.svg"></svg>
    <svg v-if="kind=='video'" class="content-icon" src="./content-icons/video.svg"></svg>
    <svg v-if="kind=='audio'" class="content-icon" src="./content-icons/audio.svg"></svg>
    <svg v-if="kind=='document'" class="content-icon" src="./content-icons/document.svg"></svg>
    <svg v-if="kind=='exercise'" class="content-icon" src="./content-icons/exercise.svg"></svg>
  </div>

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
      kind: {
        type: String,
        required: true,
        validator(value) {
          for (const contentKind in ContentKinds) {
            if (value === ContentKinds[contentKind] || 'topic') {
              return true;
            }
          }
          return false;
        },
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
