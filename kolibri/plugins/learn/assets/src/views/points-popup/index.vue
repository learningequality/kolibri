<template>

  <core-modal
    :title="$tr('niceWork')"
    @cancel="closePopover"
  >

    <div class="progress-icon">
      <progress-icon :progress="1" />
    </div>


    <div class="points-wrapper">
      <div class="points">
        <points-icon class="points-icon" :active="true" />
        <span class="points-amount">{{ $tr('plusPoints', { maxPoints }) }}</span>
      </div>
    </div>

    <ui-alert
      v-if="!isUserLoggedIn"
      :dismissible="false"
      type="warning"
    >
      {{ $tr('signIn') }}
    </ui-alert>

    <div v-if="nextContent" class="next-item-section">
      <h2 class="next-item-heading">{{ $tr('nextContent') }}</h2>
      <div>
        <content-icon class="nex-item-icon" :kind="nextContent.kind" />
        <span class="next-item-title">{{ nextContent.title }}</span>
      </div>
    </div>

    <div class="core-modal-buttons">
      <k-button
        :text="$tr('close')"
        @click="closePopover"
      />
      <slot name="nextItemBtn"></slot>
    </div>

  </core-modal>

</template>


<script>

  import { contentPoints, isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import { MaxPointsPerContent, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'keen-ui/src/UiAlert';

  const kindToLabelMap = {
    [ContentNodeKinds.TOPIC]: 'topic',
    [ContentNodeKinds.CHANNEL]: 'channel',
    [ContentNodeKinds.EXERCISE]: 'exercise',
    [ContentNodeKinds.VIDEO]: 'video',
    [ContentNodeKinds.AUDIO]: 'audio',
    [ContentNodeKinds.DOCUMENT]: 'document',
    [ContentNodeKinds.HTML5]: 'html5',
  };

  export default {
    name: 'pointsPopup',
    $trs: {
      plusPoints: '+ { maxPoints, number } Points',
      niceWork: 'Great work! Keep it up!',
      nextContent: 'Next Item',
      topic: 'Topic',
      channel: 'Channel',
      exercise: 'Exercise',
      video: 'Video',
      audio: 'Audio',
      document: 'Document',
      html5: 'App',
      item: 'Item',
      close: 'Close',
      pointsForCompletion: 'Points for completion',
      signIn: 'Sign in or create an account to save points you earn',
    },
    components: {
      pointsIcon,
      contentIcon,
      progressIcon,
      coreModal,
      kButton,
      uiAlert,
    },
    vuex: {
      getters: {
        contentPoints,
        isUserLoggedIn,
      },
    },
    props: {
      nextContent: {
        type: Object,
      },
    },
    computed: {
      maxPoints() {
        return MaxPointsPerContent;
      },
      nextKind() {
        return this.$tr(kindToLabelMap[this.nextContent.kind] || 'item');
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
