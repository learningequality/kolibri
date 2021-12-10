<template>

  <div
    v-if="contentNode"
    class="resource-card-outer"
  >
    <div
      v-if="!contentNode.is_leaf"
      class="topic-bar"
      :style="{ backgroundColor: $themeTokens.text }"
    ></div>
    <BaseCard
      v-bind="{ to, title, collectionTitle }"
      class="resource-card"
    >
      <template #topLeft>
        <ContentNodeThumbnail
          :contentNode="contentNode"
          rounded
        />
      </template>
      <template #topRight>
        <LearningActivityLabel :contentNode="contentNode" />
        <KButton
          v-if="contentNode.copies"
          appearance="basic-link"
          class="copies"
          :text="coreString('copies', { num: contentNode.copies.length })"
          @click.prevent="$emit('openCopiesModal', contentNode.copies)"
        />
      </template>

      <template #progress>
        <ProgressBar :contentNode="contentNode" />
      </template>
    </BaseCard>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ContentNodeThumbnail from '../../thumbnails/ContentNodeThumbnail';
  import ProgressBar from '../../ProgressBar';
  import BaseCard from '../BaseCard';
  import LearningActivityLabel from './LearningActivityLabel';

  export default {
    name: 'ResourceCard',
    components: {
      BaseCard,
      ContentNodeThumbnail,
      LearningActivityLabel,
      ProgressBar,
    },
    mixins: [commonCoreStrings],
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      /**
       * vue-router link object
       */
      to: {
        type: Object,
        required: true,
      },
      collectionTitle: {
        type: String,
        required: false,
        default: '',
      },
    },
    data() {
      return {
        title: this.contentNode ? this.contentNode.title : '',
      };
    },
  };

</script>


<style lang="scss" scoped>

  .copies {
    float: right;
  }

  .resource-card-outer {
    position: relative;
  }

  .topic-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 10px;
    border-radius: 8px 8px 0 0;
  }

  .resource-card {
    padding-top: 26px;
  }

</style>
