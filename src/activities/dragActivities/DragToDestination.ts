import { ActivityContext } from "../ActivityContext";
import { IActivityObject, IActivityRequirements } from "../activityManager";
import {
    playInitialElements,
    prepareActivity,
    undoPrepareActivity
} from "../../dragActivityRuntime";
// tslint:disable-next-line: no-submodule-imports
/* Not using. See comment below:
    const activityCss = require("!!raw-loader!./multipleChoiceDomActivity.css")
    .default;*/

// This class is basically an adapter that implements IActivityObject so that activities that
// are created by Bloom's DragActivityTool (the 2024 Bloom Games) can connect to the
// dragActivityRuntime.ts functions that actually do the work of the activity (and are shared with
// Bloom desktop's Play mode).)

// Note that you won't find any code using this directly. Instead,
// it gets used by the ActivityManager as the default export of this module.
export default class DragToDestinationActivity implements IActivityObject {
    private activityContext: ActivityContext;
    // When a page that has this activity becomes the selected one, the bloom-player calls this.
    // We need to connect any listeners, start animation, etc. Here,
    // we are using a javascript class to make sure that we get a fresh start,
    // which is important because the user could be either
    // coming back to this page, or going to another instance of this activity
    // in a subsequent page.
    public constructor(public pageElement: HTMLElement) {}

    public showingPage(activityContext: ActivityContext) {
        this.activityContext = activityContext;
        this.prepareToDisplayActivityEachTime(activityContext);
    }

    public doInitialSoundAndAnimation(activityContext: ActivityContext) {
        playInitialElements(activityContext.pageElement);
    }

    // Do just those things that we only want to do once per read of the book.
    // In the current implementation of activityManager, this is operating on a copy of the page html,
    // NOT the real DOM the user will eventually interact with.
    public initializePageHtml(activityContext: ActivityContext) {}

    // The context removes event listeners each time the page is shown, so we have to put them back.
    private prepareToDisplayActivityEachTime(activityContext: ActivityContext) {
        this.activityContext = activityContext;
        // This class is added one layer outside the page body. This is an element that is a wrapper
        // for our scoped styles...the furthest out element we can put classes on and have them work
        // properly with scoped styles. It's a good place to put classes that affect the state of everything
        // in the page. This class indicates in Bloom Desktop that the page is in play mode.
        // In Bloom Player, it always is. This helps make a common stylesheet work consistently.
        // Bloom Player may also add drag-activity-correct or drag-activity-wrong to this element,
        // after checking an answer, or drag-activity-solution when showing the answer.
        activityContext.pageElement.parentElement?.classList.add(
            "drag-activity-play"
        );
        prepareActivity(activityContext.pageElement, next => {
            // Move to the next or previous page. None of our current bloom game activities use this, but it's available
            // if we create an activity with built-in next/previous page buttons.
            if (next) {
                activityContext.navigateToNextPage();
            } else {
                activityContext.navigateToPreviousPage();
            }
        });
    }

    // When our page is not the selected one, the bloom-player calls this.
    // It will also tell our context to stop, which will disconnect the listeners we registered with it
    public stop() {
        if (this.activityContext) {
            undoPrepareActivity(this.activityContext.pageElement);
            this.activityContext.pageElement.parentElement?.classList.remove(
                "drag-activity-play",
                "drag-activity-start", // I don't think Bloom Player will ever add this, but just in case.
                "drag-activity-correct",
                "drag-activity-wrong",
                "drag-activity-solution"
            );
        }
    }
}

export function activityRequirements(): IActivityRequirements {
    return {
        dragging: true, // this activity is all about dragging things around, we don't want dragging to change pages
        clicking: true, // not sure we need this, but can we actually support dragging without supporting clicking?
        typing: false,
        soundManagement: true // many sounds played only after specific events.
    };
}
