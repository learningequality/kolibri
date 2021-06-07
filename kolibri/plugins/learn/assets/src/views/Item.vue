<template>

  <div>
    <h2>{{ title }}</h2>
    <!-- :key="content.id"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :isLeaf="content.is_leaf"
      :progress="content.progress || 0"
      :numCoachContents="content.num_coach_contents"
      :link="genContentLink(content.id, content.is_leaf)"
      :contentId="content.content_id" -->
    <!-- <p>{{ key }}</p>
    <p>{{ title }}</p>
    <p>{{ kind }}</p> -->


  </div>
  <!-- placeholder for learning activity type chips TODO update with chip component -->

</template>


<script>

  // import { validateContentNodeKind, validateLinkObject } from 'kolibri.utils.validators';

  export default {
    name: 'Item',
    props: {
      title: {
        type: String,
        required: true,
      },
      //   kind: {
      //     type: String,
      //     required: true,
      //     validator: validateContentNodeKind,
      //   },
      //   progress: {
      //     type: Number,
      //     required: false,
      //     default: 0.0,
      //     validator(value) {
      //       return value >= 0.0 && value <= 1.0;
      //     },
      //   },
      //   link: {
      //     type: Object,
      //     required: true,
      //     validator: validateLinkObject,
      //   },
    },
  };

</script>
