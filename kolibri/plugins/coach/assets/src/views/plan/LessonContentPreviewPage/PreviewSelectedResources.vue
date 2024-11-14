<template>

  <ManageSelectedLessonResources 
    :lessonResourceList="resources"
    :lessonObject="lessonObject"
  />

</template>


<script>

  import ManageSelectedLessonResources from '../LessonResourceSelectionPage/ManageSelectedLessonResource';

  export default {
    name: 'PreviewSelectedResources',
    components: {
      ManageSelectedLessonResources,
    },
    data() {
      return {
        resources: [],
        lessonObject: {},
      }
    },  
  };

</script>
