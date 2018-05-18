<template>

  <div>
    <transition name="slidein" appear>
      <div v-if="useSnackbar" class="snackbar">
        <ui-icon-button
          size="small"
          icon="close"
          :ariaLabel="$tr('close')"
          @click="closePopover"
        />
        <!--TODO: DRY this up-->
        <div class="progress-and-points">
          <div class="progress-wrapper">
            <progress-icon :progress="1" class="progress-icon" />
            {{ $tr('completed') }}
          </div>

          <div class="points-wrapper">
            <points-icon class="points-icon" :active="true" />
            <span class="points-amount">{{ $tr('plusPoints', { maxPoints }) }}</span>
          </div>
        </div>
        <div v-if="nextContent" class="next-item-section">
          <h2 class="next-item-heading">{{ $tr('nextContent') }}</h2>
          <content-card
            :title="nextContent.title"
            :thumbnail="null"
            :description="nextContent.description"
            :kind="nextContent.kind"
            :link="genNextContentLink"
            :isMobile="true"
          />
        </div>
      </div>
    </transition>

    <core-modal
      v-if="!useSnackbar"
      :title="$tr('greatWork')"
      @cancel="closePopover"
    >

      <div class="progress-and-points">
        <div class="progress-wrapper">
          <progress-icon :progress="1" class="progress-icon" />
          {{ $tr('completed') }}
        </div>

        <div class="points-wrapper">
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
        <content-card
          :title="nextContent.title"
          :thumbnail="null"
          :description="nextContent.description"
          :kind="nextContent.kind"
          :link="genNextContentLink"
          :isMobile="true"
        />
      </div>

      <div class="core-modal-buttons">
        <k-button
          class="close-button"
          :text="$tr('close')"
          @click="closePopover"
        />
        <k-router-link
          v-if="nextContent"
          appearance="raised-button"
          class="next-button"
          :primary="true"
          :text="$tr('goToNextItem')"
          :to="genNextContentLink"
        />
      </div>

    </core-modal>
  </div>

</template>


<script>

  import { contentPoints, isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import { MaxPointsPerContent, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import uiAlert from 'keen-ui/src/UiAlert';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import { PageNames, ClassesPageNames } from '../constants';
  import contentCard from './content-card';
  import { lessonResourceViewerLink } from './classes/classPageLinks';

  export default {
    name: 'pointsPopup',
    $trs: {
      plusPoints: '+ { maxPoints, number } Points',
      greatWork: 'Great work, keep it up!',
      nextContent: 'Next resource',
      close: 'Close',
      signIn: 'Sign in or create an account to save points you earn',
      goToNextItem: 'Go to next item',
      completed: 'Completed',
    },
    components: {
      pointsIcon,
      progressIcon,
      coreModal,
      kButton,
      uiAlert,
      contentCard,
      kRouterLink,
      UiIconButton,
    },
    vuex: {
      getters: {
        contentPoints,
        isUserLoggedIn,
      },
    },
    props: {
      useSnackbar: {
        type: Boolean,
        required: true,
      },
      nextContent: {
        type: Object,
      },
      pageName: {
        type: String,
        required: true,
      },
    },
    computed: {
      maxPoints() {
        return MaxPointsPerContent;
      },
      genNextContentLink() {
        // HACK Use a the Resource Viewer Link instead
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return lessonResourceViewerLink(Number(this.$route.params.resourceNumber) + 1);
        }
        return {
          name:
            this.nextContent.kind === ContentNodeKinds.TOPIC
              ? PageNames.TOPICS_TOPIC
              : PageNames.RECOMMENDED_CONTENT,
          params: { id: this.nextContent.id },
        };
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

  .progress-and-points
    text-align: center
    margin-bottom: 16px

  .points-wrapper
    margin-left: 8px

  .progress-wrapper, .points-wrapper
    display: inline-block

  .progress-icon
    vertical-align: text-top
    margin-right: 4px

  .points-icon
    display: inline-block
    width: 24px
    height: 24px
    margin-right: 4px
    vertical-align: text-bottom

  .points-amount
    font-weight: bold
    color: $core-status-correct

  .next-item-section
    text-align: left

  .next-item-heading
    margin: 0 0 8px

  .close-button
    margin-right: 8px

  .next-button
    margin-right: 0

  .core-modal-buttons
    margin-top: 8px

  .snackbar
    position: fixed
    bottom: 8px
    right: 8px
    width: 304px
    z-index: 24
    padding: 8px
    background-color: $core-bg-canvas
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2),
                0 4px 5px 0 rgba(0, 0, 0, 0.14),
                0 1px 10px 0 rgba(0, 0, 0, 0.12)
    animation-fill-mode: both
    animation-timing-function: cubic-bezier(0.35, 0, 0.25, 1)
    animation-duration: 0.3s
    font-size: smaller
    text-align: right

  .slidein-enter-active
    animation-name: slidein

  .slidein-leave-active
    animation-name: slidein
    animation-direction: reverse

  @keyframes slidein
    from
      transform: translate3d(0, 100%, 0)
      visibility: visible
    to
      transform: translate3d(0, 0, 0)

</style>
