<template>

  <div class="content-grid">
    <EdulutionContentCard
      v-for="content in contents"
      :key="content.id"
      class="grid-item"
      :isMobile="windowIsSmall"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress || 0"
      :numCoachContents="content.num_coach_contents"
      :link="genContentLink(content.id, content.kind)"
      :contentId="content.content_id"
      :copiesCount="content.copies_count"
      :pendingPrerequisites="content.pendingPrerequisites"
      @openCopiesModal="openCopiesModal"
    />
    <CopiesModal
      v-if="modalIsOpen"
      :uniqueId="uniqueId"
      :sharedContentId="sharedContentId"
      @cancel="modalIsOpen = false"
    />
  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import CopiesModal from '../../../../learn/assets/src/views/CopiesModal';
  import EdulutionContentCard from './EdulutionContentCard';

  export default {
    name: 'ContentCardGroupGrid',
    components: {
      EdulutionContentCard,
      CopiesModal,
    },
    mixins: [responsiveWindow],
    props: {
      contents: {
        type: Array,
        required: true,
      },
      genContentLink: {
        type: Function,
        validator(value) {
          return validateLinkObject(value(1, 'exercise'));
        },
        default: () => {},
        required: false,
      },
    },
    data: () => ({
      modalIsOpen: false,
      sharedContentId: null,
      uniqueId: null,
    }),
    methods: {
      openCopiesModal(contentId) {
        this.sharedContentId = contentId;
        this.uniqueId = this.contents.find(content => content.content_id === contentId).id;
        this.modalIsOpen = true;
      },
    },
  };

</script>


<style lang="scss" scoped>

  $gutters: 17px;

  .grid-item {
    margin-right: $gutters;
    margin-bottom: $gutters;
  }

  .content-grid {
    padding-top: 21px !important;
    padding-left: 8% !important;
  }

</style>
