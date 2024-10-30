
import { ref, computed } from 'kolibri.lib.vuex';
import { ContentNodeResource, ChannelResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';





function useResourceSelections({
    visibleResources,     // Ref<string[]> - Currently visible resources
    disabledResources,    // Ref<string[]> - Resources that should be disabled
    checkedResources,     // Ref<string[]> - Currently selected resources
    handleChange,      // Function - Defined in the parent to handle a resource selection change
    handleSelectAll       // Function - Defined in the parent to handle select all functionality
}) {
    // Data properties for access by child components
    const allVisibleResources = visibleResources;     // For components to know what's visible
    const allCheckedResources = checkedResources;     // To track currently selected resources
    const allDisabledResources = disabledResources;   // To know which resources are unselectable

    // Methods to determine selection state, directly reflecting the parent's props
    function isSelected(ContentNodeResource) {
        if (content.is_leaf) {
            content = [content];
    } else {
        
        if (!content.children.more && !content.children.results.some(n => !n.is_leaf)) {
          content = content.children.results;
        }
        return allCheckedResources.includes(ContentNodeResource);
    }
}

    function isDisabled(ContentNodeResource) {
       
        return allDisabledResources.includes(resourceId);
    }

    // Method for handling individual selection change, calls parent handler
    function onResourceChange(resourceId) {
        handleChange(resourceId);
    }

    // Function to handle select all functionality
    function onSelectAll() {
        handleSelectAll();
    }

    //  Then we can expose relevant data and functions for components
    return {
        allVisibleResources,
        allCheckedResources,
        allDisabledResources,
        isSelected,
        isDisabled,
        onResourceChange,
        onSelectAll,
    };
}
}
