<template>

  <core-modal :title="$tr('niceWork')" @cancel="closePopover">

    <div class="progress-icon">
      <progress-icon :progress="1"/>
    </div>


    <div class="points-wrapper">
      <h2>{{ $tr('pointsForCompletion') }}</h2>
      <div class="points">
        <points-icon class="points-icon" :active="true"/>
        <span class="points-amount">{{ $tr('plusPoints', { maxPoints }) }}</span>
      </div>
    </div>

    <div class="next-item-section">
      <h2 class="next-item-heading">{{ $tr('nextContent') }}</h2>
      <div>
        <content-icon class="nex-item-icon" :kind="kind"/>
        <span class="next-item-title">{{ title }}</span>
      </div>
    </div>

    <div class="buttons">
      <icon-button :text="$tr('close')" @click="closePopover" class="close-button"/>
      <slot name="nextItemBtn"/>
    </div>

  </core-modal>

</template>


<script>

  import { contentPoints } from 'kolibri.coreVue.vuex.getters';
  import { MaxPointsPerContent, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    $trNameSpace: 'pointsPopup',
    $trs: {
      plusPoints: '+ { maxPoints, number } Points',
      niceWork: 'Great work!',
      nextContent: 'Next Item',
      topic: 'Topic',
      exercise: 'Exercise',
      video: 'Video',
      audio: 'Audio',
      document: 'Document',
      html5: 'HTML5 app',
      item: 'Item',
      close: 'Practice again',
      pointsForCompletion: 'Points for completion',
    },
    components: {
      pointsIcon,
      contentIcon,
      progressIcon,
      coreModal,
      iconButton,
    },
    vuex: { getters: { contentPoints } },
    props: {
      kind: { type: String },
      title: { type: String },
    },
    computed: {
      maxPoints() {
        return MaxPointsPerContent;
      },
      nextKind() {
        const kind = this.kind;
        if (kind === ContentNodeKinds.TOPIC) {
          return this.$tr('topic');
        } else if (kind === ContentNodeKinds.EXERCISE) {
          return this.$tr('exercise');
        } else if (kind === ContentNodeKinds.VIDEO) {
          return this.$tr('video');
        } else if (kind === ContentNodeKinds.AUDIO) {
          return this.$tr('audio');
        } else if (kind === ContentNodeKinds.DOCUMENT) {
          return this.$tr('document');
        } else if (kind === ContentNodeKinds.HTML5) {
          return this.$tr('html5');
        }
        return this.$tr('item');
      },
    },
    methods: {
      closePopover() {
        this.$emit('close');
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .points-wrapper
    margin-bottom: 2em
    text-align: center

  .points
    display: inline-block

  .points-icon
    float: left
    width: 20px
    height: 20px

  .points-amount
    padding-left: 5px
    font-weight: bold
    color: $core-status-correct

  .nex-item-icon
    font-size: 1.5em

  .next-item-section
    text-align: center
    margin-bottom: 2em

  .buttons
    text-align: center
    padding: 0 0 0.5em

  .next-item-heading
    margin: 0

  .close-button
    margin-right: 0.5em

  .progress-icon
    text-align: center
    margin-bottom: 2em

  .next-item-title
    padding-left: 8px

  h2
    margin-top: 0

</style>
