<template>

  <KModal
    v-if="copies.length"
    :title="$tr('copies')"
    :submitText="coreString('closeAction')"
    @submit="$emit('closeModal')"
  >
    <transition mode="out-in">
      <ul>
        <li
          v-for="(copy, index) in copies"
          :key="index"
          class="copy"
        >
          <div class="title">
            <KRouterLink
              :text="copy.title"
              :to="contentLink(copy)"
            />
          </div>
          <ol>
            <li
              v-for="(ancestor, index2) in copy.ancestors"
              :key="index2"
              class="ancestor"
              :class="{ arrow: index2 < copy.ancestors.length - 1 }"
            >
              {{ ancestor.title }}
            </li>
          </ol>
        </li>
      </ul>
    </transition>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useContentLink from '../composables/useContentLink';

  export default {
    name: 'CopiesModal',
    mixins: [commonCoreStrings],
    setup() {
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      return { genContentLinkBackLinkCurrentPage };
    },
    props: {
      copies: {
        type: Array,
        required: true,
      },
    },
    methods: {
      contentLink(copy) {
        return this.genContentLinkBackLinkCurrentPage(copy.id, true);
      },
    },
    $trs: {
      copies: {
        message: 'Locations',
        context:
          'Some Kolibri resources may be duplicated in different topics or channels.\n\nSearch results will indicate when a resource is duplicated, and learners can click on the "...locations" link to discover the details for each location of the resource.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .ar {
    text-align: right;
  }

  ul,
  ol {
    padding: 0;
  }

  ol {
    font-size: small;
  }

  .copy {
    margin-bottom: 16px;
  }

  li {
    list-style: none;
  }

  .ancestor {
    display: inline-block;
  }

  .arrow {
    &::after {
      margin-right: 8px;
      margin-left: 8px;
      content: '›';
    }
  }

  .title {
    margin-bottom: 4px;
  }

</style>
