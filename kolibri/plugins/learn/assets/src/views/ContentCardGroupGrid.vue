<template>

  <div class="content-grid">
    <ContentCard
      v-for="content in contents"
      :key="content.id"
      class="grid-item"
      :isMobile="windowIsSmall"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :isLeaf="content.is_leaf"
      :progress="content.progress || 0"
      :numCoachContents="content.num_coach_contents"
      :link="genContentLink(content.id, content.is_leaf)"
      :contentId="content.content_id"
      :copiesCount="content.copies_count"
      @openCopiesModal="openCopiesModal"
    />
    <CopiesModal
      v-if="modalIsOpen"
      :uniqueId="uniqueId"
      :sharedContentId="sharedContentId"
      @submit="modalIsOpen = false"
    />
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import genContentLink from '../utils/genContentLink';
  import ContentCard from './ContentCard';
  import CopiesModal from './CopiesModal';

  export default {
    name: 'ContentCardGroupGrid',
    components: {
      ContentCard,
      CopiesModal,
    },
    mixins: [responsiveWindowMixin],
    props: {
      contents: {
        type: Array,
        required: true,
      },
      cardViewStyle: {
        type: String,
        required: true,
        default: 'card',
        validator(value) {
          return ['card', 'list'].includes(value);
        },
        default: () => ({}),
        required: false,
      },
    },
    data: () => ({
      modalIsOpen: false,
      sharedContentId: null,
      uniqueId: null,
    }),
    methods: {
      genContentLink,
      openCopiesModal(contentId) {
        this.sharedContentId = contentId;
        this.uniqueId = this.contents.find(content => content.content_id === contentId).id;
        this.modalIsOpen = true;
      },
    },
  };

</script>


<style lang="scss" scoped>

  $gutters: 16px;
  .grid-item {
    margin-right: $gutters;
    margin-bottom: $gutters;
  }

</style>
