"useStrict";

export function activityRequirements() {
    return {
        dragging: false,
        clicking: true,
        typing: false
    };
}

export default class WidgetTestActivity {
    // When a page that has this activity becomes the selected one, the bloom-player calls this
    // class's constructor and then calls start().
    // We need to connect any listeners, start animation, etc. Here, we are using a javascript class
    // to make sure that we get a fresh start, which is important because the user could be either
    // coming back to this page, or going to another instance of this activity in a subsequent page.
    // This particular widget hides the navigation buttons (Next/Prev) and has its own buttons on the
    // page that go forward to the next page (which contains another page with the same widget) or
    // back to the previous page. This tests a widget's ability to control navigation from
    // the ActivityContext (passed to the 'start' method).
    constructor(pageElement) {
        const activityContainer = pageElement.getElementsByClassName(
            "putMeHere"
        )[0];
        const containerCss = "height:100%;width:100%;display:table";
        const buttonCss =
            "margin:20px;padding:5px;display:block;max-width:120px";
        this.button1 = document.createElement("button");
        this.button1.textContent = "Forward";
        this.button1.setAttribute("style", buttonCss);
        this.button2 = document.createElement("button");
        this.button2.textContent = "Back";
        this.button2.setAttribute("style", buttonCss);
        const div = document.createElement("div");
        div.setAttribute("style", containerCss);
        div.append(this.button1);
        div.append(this.button2);
        activityContainer.append(div);
    }

    start(activityContext) {
        console.log("WidgetTestActivity.start()");
        this.activityContext = activityContext;
        this.button1.onclick = () => this.activityContext.navigateToNextPage();
        this.button2.onclick = () =>
            this.activityContext.navigateToPreviousPage();
    }

    stop() {
        console.log("WidgetTestActivity.stop()");
        // Unattach listeners? Nope. Done automatically.
    }
}
