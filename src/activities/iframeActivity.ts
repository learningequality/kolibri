// An "iframe activity" is one where bloom-player doesn't communicate with the
// activity at all. It just displays the page, with an iframe pointed at some
// little self-contained web page. This is useful because there are lots of
// game runtimes and other ways (i.e. Apple's iwidgets) that can thus be embedded
// in a Bloom page.

import { ActivityContext } from "./ActivityContext";
import { IActivityObject } from "./activityManager";

// Because we don't actually talk to the activity, this class doesn't do anything,
// it just adapts the iframe to the bloom-player activity system.

export default class IframeActivity implements IActivityObject {
    // When a page that has this activity becomes the selected one, the bloom-player calls this.
    // We need to connect any listeners, start animation, etc. Here,
    // we are using a javascript class to make sure that we get a fresh start,
    // which is important because the user could be either
    // coming back to this page, or going to another instance of this activity
    // in a subsequent page.
    // eslint-disable-next-line no-unused-vars
    constructor(pageElement: Element) {
        console.log("iframe activity constructed");
    }
    // Do just those things that we only want to do once per read of the book.
    public initializePageHtml(activityContext: ActivityContext) {}
    public showingPage() {
        console.log("iframe activity showingPage");
    }
    public stop() {
        console.log("iframe activity stop");
    }
}

// We don't actually know what a particular iframe activity will want, so we assume
// it wants everything. If desired, we could introduce a data-activity-requirements on the page
// that would tell us.
export function activityRequirements() {
    return {
        dragging: true,
        clicking: true,
        typing: true
    };
}
