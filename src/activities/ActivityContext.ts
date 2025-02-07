import {
    reportScoreForCurrentPage,
    getPageData,
    storePageData
} from "../page-api";
// import doesn't work here...if we really want it to
// https://stackoverflow.com/questions/56782452/how-to-fix-module-not-found-for-audio-files-using-file-loader-images-css-an
// has some ideas.
const rightAnswer = require("./right_answer.mp3");
const wrongAnswer = require("./wrong_answer.mp3");

// This is passed to an activity to give it things that it needs. It's mostly
// a wrapper so that activities don't have direct knowledge of how parts outside
// of them are arranged.
export class ActivityContext {
    public pageElement: HTMLElement;
    public pageIndex: number;
    public analyticsCategory: string;
    // Typically, indices of all pages with the same analytics category.
    // (This is necessary to be able to report analytics for this category as a group.)
    public pagesToGroupForAnalytics: number[] | undefined;

    private listeners = new Array<{
        name: string;
        target: Element;
        listener: EventListener;
    }>();

    constructor(
        pageIndex: number,
        pageDiv: HTMLElement,
        analyticsCategory: string,
        pagesToGroupForAnalytics?: number[]
    ) {
        this.pageIndex = pageIndex;
        this.pageElement = pageDiv;
        this.analyticsCategory = analyticsCategory;
        this.pagesToGroupForAnalytics = pagesToGroupForAnalytics;
    }

    // Report a score that can be used for analytics. The caller can call this repeatedly without worrying
    // about the logic of whether we only report the user's first attempt.
    public reportScore(possiblePoints: number, actualPoints: number) {
        // please leave this log in... if we could make it only show in storybook, we would
        console.log(
            `ActivityContext.reportScoreForCurrentPage(<page>, ${possiblePoints}, ${actualPoints},${this.analyticsCategory})`
        );
        reportScoreForCurrentPage(
            this.pageIndex,
            possiblePoints,
            actualPoints,
            this.analyticsCategory,
            this.pagesToGroupForAnalytics
        );
    }

    // Get data used during this current reading of the book. The `key` parameter only needs to be
    // unique to the activity's page.
    public getSessionPageData(key: string): string {
        return getPageData(this.pageIndex, key);
    }

    // Set data used during this current reading of the book that you can read if the
    // they come back to this page. The `key` parameter only needs to be
    // unique to the activity's page.
    public storeSessionPageData(key: string, value: string) {
        // please leave this log in... if we could  make it only show in storybook, we would
        console.log(
            `ActivityContext.storePageData(<page>, '${key}', '${value}')`
        );
        storePageData(this.pageIndex, key, value);
    }

    public playCorrect() {
        // NB: if this stops working in storybook; the file should be found because the package.json
        // script that starts storybook has a "--static-dir" option that should include the folder
        // containing the standard activity sounds.
        // require on an mp3 in storybook gives us some sort of module object where the url of the sound is its 'default'
        // whatever we're doing to build the production version, require on the mp3 gives us the url directly.
        this.playSound(rightAnswer.default ?? rightAnswer);
    }

    public playWrong() {
        // require on an mp3 gives us some sort of module object where the url of the sound is its 'default'
        // whatever we're doing to build the production version, require on the mp3 gives us the url directly.
        this.playSound(wrongAnswer.default ?? wrongAnswer);
    }

    private getPagePlayer(): any {
        let player = document.getElementById("activity-sound-player") as any;
        if (player && !player.play) {
            player.remove();
            player = null;
        }
        if (!player) {
            player = document.createElement("audio");
            player.setAttribute("id", "activity-sound-player");
            document.body.appendChild(player);
        }
        return player;
    }

    public playSound(url: string) {
        const player = this.getPagePlayer();
        player.setAttribute("src", url);
        player.play();
    }

    public addActivityStylesForPage(css: string) {
        if (!this.pageElement.querySelector("[data-activity-stylesheet]")) {
            const style = this.pageElement.ownerDocument!.createElement(
                "style"
            );
            style.setAttribute("data-activity-stylesheet", ""); // value doesn't matter
            // REVIEW: Scoped styles have been removed from the spec, so we are using
            // a polyfill,  https://github.com/samthor/scoped, which is not very commonly used
            // (only 56 stars at the moment). So we should not really be depending on this... it
            // could break or whatever.
            // Also, it's not working in Bloom Editor (maybe the polyfill could be added there?).
            // I think it's better to just scope by hand using a class that
            // uniquely matches the page. So I'm going to remove this.
            style.setAttribute("scoped", "true");
            style.innerText = css;
            this.pageElement.parentNode!.insertBefore(style, this.pageElement); //NB: will be added even if firstChild is null
        }
    }

    // Activities should use this to attach listeners so that we can detach them when the page is no longer
    // showing. Among other things, this prevents double-attaching.
    public addEventListener(
        name: string,
        target: Element,
        listener: EventListener,
        options?: AddEventListenerOptions | undefined
    ) {
        // store the info we need in order to detach the listener when we are stop()ed
        this.listeners.push({
            name,
            target,
            listener
        });
        target.addEventListener(name, listener, options);
    }

    // this is called by the activity manager after it stops the activity.
    public stop() {
        // detach all the listeners
        this.listeners.forEach(l =>
            l.target.removeEventListener(l.name, l.listener)
        );
    }

    private sendMessageToPlayer(message: string) {
        const activityMessage = {
            messageType: "control",
            controlAction: message
        };
        //console.log(`Sent activity navigation message to Player: ${message}`);
        const messageJson = JSON.stringify(activityMessage);
        window.postMessage(messageJson, "*"); // any window may receive
    }

    public navigateToNextPage() {
        this.sendMessageToPlayer("navigate-to-next-page");
    }

    public navigateToPreviousPage() {
        this.sendMessageToPlayer("navigate-to-previous-page");
    }
}
