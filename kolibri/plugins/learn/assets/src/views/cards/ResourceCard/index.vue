<template>

  <BaseCard
    v-if="contentNode"
    v-bind="{ to, title, collectionTitle }"
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

</style>
