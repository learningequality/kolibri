<template>

  <KGrid>
    <KGridItem
      v-for="shortcut in shortcuts"
      :key="shortcut.id"
      :layout="{ span: cardColumnSpan }"
    >
      <ChannelCard
        :isMobile="windowIsSmall"
        :title="shortcut.title"
        :thumbnail="getThumbnail(shortcut)"
        :kind="shortcut.kind"
        :tagline="getTagLine(shortcut)"
        :progress="shortcut.progress || 0"
        :numCoachContents="shortcut.num_coach_contents"
        :link="genContentLink(shortcut.id, shortcut.kind)"
        :contentId="shortcut.content_id"
        :copiesCount="shortcut.copies_count"
        :breadcrumbs="getBreadcrumbs(shortcut)"
      />
    </KGridItem>
  </KGrid>

</template>


<script>

  // TODO: This is almost identical to ChannelCardGroupGrid. It probably makes
  //       sense that these are separate components since they represent
  //       different things, but we should be reusing code here.

  import ChannelCard from './ChannelCard';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import { validateLinkObject } from 'kolibri.utils.validators';

  export default {
    name: 'ShortcutCardGroupGrid',
    components: {
      ChannelCard,
    },
    mixins: [responsiveWindowMixin],
    props: {
      shortcuts: {
        type: Array,
        required: true,
      },
      genContentLink: {
        type: Function,
        validator(value) {
          return true;
          // return validateLinkObject(value(1, 'exercise'));
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
    computed: {
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
      },
    },
    methods: {
      getTagLine(content) {
        return content.tagline || content.description;
      },
      getThumbnail(content) {
        return getContentNodeThumbnail(content);
      },
      getBreadcrumbs(content) {
        // We won't bother generating breadcrumb links here.
        return content.ancestors.map(ancestor => ({
          text: ancestor.title
        }));
      },
    },
  };

</script>


<style lang="scss" scoped></style>
