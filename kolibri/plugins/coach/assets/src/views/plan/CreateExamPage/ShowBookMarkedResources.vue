  <template>
    <div class="">

        <ContentCardList
            :contentList="bookmarks"
            :showSelectAll="selectAllIsVisible"
            :viewMoreButtonState="viewMoreButtonState"
            :selectAllChecked="bookmarks.length === 0"
            :contentIsChecked="contentIsInLesson"
            :contentHasCheckbox="c => !contentIsDirectoryKind(c)"
            :contentCardMessage="() =>selectionMetadata"
            :contentCardLink="contentLink"
            @changeselectall="toggleTopicInWorkingResources"
            @change_content_card="toggleSelected"
            @moreresults="handleMoreResults"
        />
    </div>
</template>

<script>
 import { useResources } from '../../../composables/useResources';
 import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
 import { PageNames } from '../../../constants';
export default {
    name:"ShowBookMarkedResources",
    components:{
        ContentCardList,
    },
    setup(){
        const {
         bookmarks
        } = useResources();

        return {
            bookmarks,
        }
    },
    computed:{
        selectAllIsVisible(){
            return true;
        },
        addableContent() {
        // Content in the topic that can be added if 'Select All' is clicked
            const list = bookmarksList;
            return list.filter(
                content => !this.contentIsDirectoryKind(content) && !this.contentIsInLesson(content)
            );
        },
        contentIsInLesson() {
            return ({ id }) =>
                Boolean(this.workingResources.find(resource => resource.contentnode_id === id));
        },
        selectionMetadata(){
            return '';
        },
    },
    data(){
        return {
            viewMoreButtonState: 'no_more_results',
        }
    },
    methods:{
        contentLink(){
            if (!content.is_leaf) {
                return {
                    name: PageNames.SELECT_FROM_RESOURCE,
                    params: {
                    topic_id: content.id,
                    },
                };
            }
        },
        toggleTopicInWorkingResources(){
            if (isChecked) {
            this.addableContent.forEach(resource => {
                this.addToResourceCache({
                node: { ...resource },
                });
            });
            this.addToWorkingResources(this.addableContent);
            } else {
            this.removeFromSelectedResources(this.quizForge.channels.value);
            }
        },
        toggleSelected(){
            if (checked) {
                this.addToSelectedResources(content);
            } else {
                this.removeFromSelectedResources([content]);
            }
        },
        handleMoreResults(){

        },
       
        contentIsDirectoryKind({ is_leaf }) {
            return !is_leaf;
        },
        
    }
}
</script>