<template>

  <router-link :to="link" class="content-card">

    <card-thumbnail
      class="thumbnail"
      :thumbnail="thumbnail"
      :kind="kind"
      :isMobile="true"
    />

    <div class="text">
      <h3
        class="title"
        :class="{'has-message': Boolean(message)}"
        dir="auto"
      >
        {{ title }}
      </h3>
      <div v-if="message" class="message">
        {{ message }}
      </div>
      <p class="description">
        <!-- eslint-disable -->
        <span :class="truncatedClass">{{ descriptionHead }}<span class="visuallyhidden">{{ descriptionTail }}</span></span>
        <!-- eslint-enable -->
        <k-button
          v-if="descriptionIsTooLong"
          @click.stop.prevent="descriptionExpanded=!descriptionExpanded"
          appearance="basic-link"
          :text="!descriptionExpanded ? $tr('viewMoreButtonPrompt') : $tr('viewLessButtonPrompt')"
        />

      </p>
    </div>

  </router-link>

</template>


<script>

  import values from 'lodash/values';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import cardThumbnail from './card-thumbnail';

  const defaultDescriptionLimit = 140;

  export default {
    name: 'lessonContentCard',
    components: {
      cardThumbnail,
      kButton,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          return values(ContentNodeKinds).includes(value);
        },
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      message: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        descriptionExpanded: false,
      };
    },
    computed: {
      descriptionHead() {
        if (this.descriptionExpanded) {
          return this.description;
        }
        return this.description.slice(0, defaultDescriptionLimit);
      },
      descriptionTail() {
        return this.description.slice(defaultDescriptionLimit);
      },
      descriptionIsTooLong() {
        return this.description.length > defaultDescriptionLimit;
      },
      truncatedClass() {
        return {
          truncated: this.descriptionIsTooLong && !this.descriptionExpanded,
        };
      },
    },
    $trs: {
      viewMoreButtonPrompt: 'View more',
      viewLessButtonPrompt: 'View less',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require './card.styl'

  .content-card
    text-decoration: none
    display: block
    border-radius: 2px
    background-color: $core-bg-light
    height: $thumb-height
    margin-bottom: 16px
    text-align: left
    display: relative

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
    position: absolute
    top: 0
    bottom: 0
    left: $thumb-width
    width: 'calc(100% - %s)' % $thumb-width // stylus exlusive
    padding: 24px
    overflow-y: auto

  .title, .description
    margin: 0

  .title, .message
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap

  .title.has-message, .message
    max-width: 45%

  .title
    font-size: 16px
    padding-bottom: 8px

  .description
    font-size: 12px

  .truncated::after
    content: '\2026\0020'
    display: inline

  .message
    color: $core-text-default
    position: absolute
    top: 24px
    right: 24px

</style>
