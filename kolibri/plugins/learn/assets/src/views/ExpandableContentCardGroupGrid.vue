<template>

  <div @click="hidden = !hidden">
    <PageHeader :title="child.title" :progress="child.progress" style="display: inline-block" />
    <UiIconButton
      size="large"
      color="red"
    >
      <mat-svg v-if="hidden" name="expand_less" category="navigation" />
      <mat-svg v-else name="expand_more" category="navigation" />
    </UiIconButton>
    <ContentCardGroupGrid
      v-if="child.children.length && hidden"
      :contents="child.children"
      :genContentLink="genContentLink"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import { PageNames } from '../constants';
  import PageHeader from './PageHeader';
  import ContentCardGroupGrid from './ContentCardGroupGrid';

  export default {
    name: 'ExpandableContentCardGroupGrid',
    components: {
      PageHeader,
      ContentCardGroupGrid,
    },
    props: { child: Object },
    data() {
      return {
        hidden: false,
      };
    },
    methods: {
      genContentLink(id, kind) {
        if (kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.KNOWLEDGE_MAP,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.TOPICS_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
  };

</script>
