<template>

  <router-link :to="link" class="card" :class="{ 'mobile-card': isMobile }">
    <card-thumbnail
      class="thumbnail"
      v-bind="{ thumbnail, progress, kind, isMobile, showContentIcon }"
    />
    <div class="text">
      <h3 class="title" dir="auto">
        <text-truncator
          :text="title"
          :maxHeight="maxTitleHeight"
        />
      </h3>
      <p
        v-if="subtitle"
        class="subtitle"
        :class="{ 'no-footer': !hasFooter }"
      >
        {{ subtitle }}
      </p>
      <div class="footer">
        <coach-content-label
          class="coach-content-label"
          :value="numCoachContents"
          :isTopic="isTopic"
        />
        <k-button
          v-if="copiesCount > 1"
          appearance="basic-link"
          class="copies"
          :text="$tr('copies', { num: copiesCount })"
          @click.prevent="$emit('openCopiesModal', contentId)"
        />
      </div>
    </div>
  </router-link>

</template>


<script>

  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import textTruncator from 'kolibri.coreVue.components.textTruncator';
  import kButton from 'kolibri.coreVue.components.kButton';
  import cardThumbnail from './card-thumbnail';

  export default {
    name: 'contentCard',
    $trs: {
      copies: '{ num, number} locations',
    },
    components: {
      cardThumbnail,
      coachContentLabel,
      textTruncator,
      kButton,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      subtitle: {
        type: String,
        required: false,
      },
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      showContentIcon: {
        type: Boolean,
        default: true,
      },
      // ContentNode.coach_content will be `0` if not a coach content leaf node,
      // or a topic without coach content. It will be a positive integer if a topic
      // with coach content, and `1` if a coach content leaf node.
      numCoachContents: {
        type: Number,
        default: 0,
      },
      progress: {
        type: Number,
        required: false,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
      contentId: {
        type: String,
        required: false,
      },
      copiesCount: {
        type: Number,
        required: false,
      },
    },
    computed: {
      isTopic() {
        return this.kind === ContentNodeKinds.TOPIC || this.kind === ContentNodeKinds.CHANNEL;
      },
      maxTitleHeight() {
        if (this.hasFooter && this.subtitle) {
          return 20;
        } else if (this.hasFooter || this.subtitle) {
          return 40;
        }
        return 60;
      },
      hasFooter() {
        return this.numCoachContents > 0 || this.copiesCount > 1;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require './card.styl'

  $margin = 16px

  .coach-content-label
    display: inline-block

  .card
    text-decoration: none
    display: inline-block
    width: $thumb-width-desktop
    vertical-align: top
    border-radius: 2px
    background-color: $core-bg-light
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14),
                0 3px 1px -2px rgba(0, 0, 0, 0.2),
                0 1px 5px 0 rgba(0, 0, 0, 0.12)
    transition: box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)
    &:hover, &:focus
      box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12),
                  0 5px 5px -3px rgba(0, 0, 0, 0.2)

  .text
    color: $core-text-default
    overflow: hidden
    padding: $margin
    height: 92px
    position: relative

  .title, .subtitle
    margin: 0

  .subtitle
    position: absolute
    top: 38px
    left: $margin
    right: $margin
    font-size: 14px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis

  .footer
    position: absolute
    font-size: 12px
    bottom: $margin
    right: $margin
    left: $margin

  .subtitle.no-footer
    top: unset
    bottom: $margin

  .copies
    display: inline-block
    float: right

  .mobile-card.card
    width: 100%
    height: $thumb-height-mobile

  .mobile-card
    .thumbnail
      position: absolute
    .text
      margin-left: $thumb-width-mobile
      height: 84px
    .subtitle
      top: 36px

</style>
