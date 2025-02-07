/*
bloom-player-core is responsible for all the behavior of working through a book, but without any UI controls
(other than page turning).
*/
/// <reference path="../node_modules/@types/jquery.nicescroll/index.d.ts" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import axios, { AxiosPromise } from "axios";
import Swiper, { SwiperInstance } from "react-id-swiper";
// This loads some JS right here that is a polyfill for the (otherwise discontinued) scoped-styles html feature
import "style-scoped/scoped.min.js";
import "swiper/dist/css/swiper.min.css";
import "./bloom-player-ui.less";
import "./bloom-player-content.less";
import "./bloom-player-pre-appearance-system-book.less";
import LiteEvent from "./event";
import { Animation } from "./animation";
import { IPageVideoComplete, Video } from "./video";
import { Music } from "./music";
import { LocalizationManager } from "./l10n/localizationManager";
import {
    reportAnalytics,
    reportPlaybackComplete,
    sendMessageToHost,
    setAmbientAnalyticsProperties,
    updateBookProgressReport
} from "./externalContext";
import {
    clearSoundLog,
    reportSoundsLogged,
    sendStringToBloomApi
} from "./videoRecordingSupport";
import LangData from "./langData";
import Replay from "@material-ui/icons/Replay";

// See related comments in controlBar.tsx
import IconButton from "@material-ui/core/IconButton";
import ArrowBack from "@material-ui/icons/ArrowBackIosRounded";
import ArrowForward from "@material-ui/icons/ArrowForwardIosRounded";
import LoadFailedIcon from "@material-ui/icons/SentimentVeryDissatisfied";

import { ActivityManager } from "./activities/activityManager";
import { LegacyQuestionHandler } from "./activities/legacyQuizHandling/LegacyQuizHandler";
import { CircularProgress } from "@material-ui/core";
import { BookInfo } from "./bookInfo";
import { BookInteraction } from "./bookInteraction";
import $ from "jquery";
import "jquery.nicescroll";
import { getQueryStringParamAndUnencode } from "./utilities/urlUtils";
import {
    kLocalStorageDurationKey,
    kLocalStorageBookUrlKey
} from "./bloomPlayerAnalytics";
import { autoPlayType } from "./bloom-player-controls";
import {
    setCurrentPage as setCurrentNarrationPage,
    currentPlaybackMode,
    setCurrentPlaybackMode,
    PlaybackMode,
    listenForPlayDuration,
    setTestIsSwipeInProgress,
    setLogNarration,
    setPlayerUrlPrefix,
    computeDuration,
    PageNarrationComplete,
    PlayFailed,
    PlayCompleted,
    ToggleImageDescription,
    pauseNarration,
    getCurrentNarrationPage,
    playNarration,
    hidingPage as hidingNarrationPage,
    pageHasAudio,
    setIncludeImageDescriptions,
    playAllSentences
} from "./narration";
import { logSound } from "./videoRecordingSupport";
import { playSoundOf } from "./dragActivityRuntime";
// BloomPlayer takes a URL param that directs it to Bloom book.
// (See comment on sourceUrl for exactly how.)
// It displays pages from the book and allows them to be turned by dragging.
// On a wide screen, an option may be used to show the next and previous pages
// beside the current one.

interface IProps {
    // Url of the bloom book (folder). Should be a valid, well-formed URL
    // e.g. any special chars in the path or book title should be appropriately encoded
    // e.g. if title is C#, url should be http://localhost:8089/bloom/C:/PathToTemp/PlaceForStagingBook/C%23
    url: string;
    distributionUrl?: string;
    metaJsonUrl?: string;
    landscape: boolean; // whether viewing as landscape or portrait
    // ``paused`` allows the parent to control pausing of audio. We expect we may supply
    // a click/touch event callback if needed to support pause-on-touch.
    paused?: boolean;
    preferredUiLanguages: string[];

    pageStylesAreNowInstalled: () => void;
    onContentClick?: (event: any) => void;

    // reportBookProperties is called when book loaded enough to determine these properties.
    // Some of this is probably obsolete, since if the player is embedded in a iframe as we currently
    // require, only the containing BloomPlayerControls can make use of it. However, it's just
    // possible we might want it if we end up with rotation-related controls. Note that the
    // same information is made available via postMessage if the control's window has a parent.
    reportBookProperties?: (properties: {
        isRtl: boolean;
        landscape: boolean;
        // Logical additions, but we don't need them yet and they cost something to compute
        // hasActivities: boolean;
        // hasAnimation: boolean;
        canRotate: boolean;
        preferredLanguages: string[];
        pageNumbers: string[]; // one per page, from data-page-number; some empty
    }) => void;

    // 'controlsCallback' feeds information about the book's contents and other things
    /// BloomPlayerControls needs back to it.
    // So far:
    // - the book's languages for the LanguageMenu to use
    // - whether the book has image descriptions or not.
    controlsCallback?: (
        bookLanguages: LangData[],
        bookHasImageDescriptions: boolean,
        // Provides the client a way to switch page numbers. It would feel more natural and React-y to
        // just pass current page number to bloom-player-controls as a property, but I don't think regenerating the whole
        // bloom-player-core to switch page numbers is a great idea.
        setCurrentPage?: (pageNo: number) => void
    ) => void;

    // A callback the client may supply to be notified whether navigation buttons are being hidden for this page.
    hidingNavigationButtonsCallback?: (hiding: boolean) => void;

    // Allows the core to inform the controls that we have been forced to pause.
    // We use this when trying to play initially and that playback fails,
    // usually because the browser doesn't think the user has interacted with the page.
    // We set it false if we can detect that the user interacted, e.g., by clicking next.
    // Though we are no longer forced to be paused, we will stay paused unless the user
    // indicates he wants sound.
    // See BL-8864.
    setForcedPausedCallback?: (paused: boolean) => void;

    // Set by BloomPlayerControls -> ControlBar -> LanguageMenu
    // Changing this should modify bloom-visibility-code-on stuff in the DOM.
    activeLanguageCode: string;

    useOriginalPageSize?: boolean;

    reportPageProperties?: (properties: {
        hasAudio: boolean;
        hasMusic: boolean;
        hasVideo: boolean;
    }) => void;

    locationOfDistFolder: string;

    // may be "largeOutsideButtons" or "smallOutsideButtons" or empty.
    outsideButtonPageClass: string;

    hideSwiperButtons?: boolean;

    autoplay?: autoPlayType;

    extraClassNames?: string;

    skipActivities?: boolean;

    shouldReadImageDescriptions: boolean;

    imageDescriptionCallback: (inImageDescription: boolean) => void;

    // A callback the client may provide in order to be notified when the current page changes.
    pageChanged?: (n: number) => void;

    // Send a report to Bloom API about sounds that have been played (when we reach the end
    // of the book in autoplay).
    shouldReportSoundLog?: boolean;
    startPage?: number; // book opens at this page (0-based index into the list of pages, ignores visible page numbers)
    // count of pages to autoplay (only applies to autoplay=yes or motion) before stopping and reporting done.
    autoplayCount?: number;
}
interface IState {
    pages: string[]; // of the book. First and last are empty in context mode.
    pageIdToIndexMap: {}; // map from page id to page index

    // concatenated stylesheets the book references or embeds.
    // Make sure these are only set once per book or else
    // it wreaks havoc on scoped styles. See BL-9504.
    styleRules: string;

    importedBodyAttributes: {};

    // indicates current page, though typically not corresponding to the page
    // numbers actually on the page. This is an index into pages, and in context
    // mode it's the index of the left context page, not the main page.
    currentSwiperIndex: number;
    isLoading: boolean;
    loadFailed: boolean;
    loadErrorHtml: string;

    //When in touch mode (in chrome debugger at least), a touch on a navigation button
    //causes a click to be raised after the onTouchEnd(). This would normally try and
    //toggle the app bar. So we have onTouchStart() set this to true and then set to
    // false in the onClick handler. Sigh.
    ignorePhonyClick: boolean;

    // True if finishUp has completed when isNewBook is true.
    // I couldn't find any other way to know if the change in the landscape prop
    // should trigger a load of the current slide. Without this, we were trying
    // to load the initial slide multiple times when a book was landscape when
    // it was loaded the first time.
    isFinishUpForNewBookComplete: boolean;

    // Works in tandem with props.setForcedPausedCallback. If true, we need to call the callback
    // whenever something happens that would end the forced pause.
    // True represents a state where we wanted to be playing but cannot (see setPausedCallback).
    // If the user interacts, which we detect as anything that makes us change page,
    // we're no longer in a FORCED pause, though we may still be paused.
    inPauseForced: boolean;
}

interface IPlayerPageOptions {
    hideNavigation?: boolean;
}

// capturing mouse event handler added to body to prevent clicks on certain
// elements from being seen by Swiper. This is an independent function so that
// it doesn't end up being added more than once, even if the code that adds it
// runs more often.
function handleInputMouseEvent(event: Event) {
    if ((event.target as HTMLElement).closest(".videoControlContainer")) {
        // Stop Swier from seeing events on these elements.
        // Note: Swiper version 11 has a class "swiper-no-swiping" that I think can be used to
        // achieve this, or configured with noSwipingClass or noSwipingSelector.
        // But we're at too low a version to use that, and bringing in the latest
        // version is non-trivial.
        event.stopPropagation();
        // We don't need to preventDefault to keep Swiper from moving the page,
        // and we don't want to because I think it would stop the mousedown
        // from eventually resulting in a click.
    }
}

const kSelectorForPotentialNiceScrollElements =
    ".bloom-translationGroup:not(.bloom-imageDescription) .bloom-editable.bloom-visibility-code-on, " +
    ".scrollable"; // we added .scrollable for branding cases where the boilerplate text also needs to scroll

export class BloomPlayerCore extends React.Component<IProps, IState> {
    private readonly activityManager: ActivityManager = new ActivityManager();
    private readonly legacyQuestionHandler: LegacyQuestionHandler;

    private readonly initialPages: string[] = ["loading..."];
    private readonly initialStyleRules: string = "";
    private originalPageClass = "Device16x9Portrait";

    private bookInfo: BookInfo = new BookInfo();
    private bookInteraction: BookInteraction = new BookInteraction();

    private static currentPagePlayer: BloomPlayerCore;
    private indicesOfPagesWhereWeShouldPreserveDOMState: any = {};
    // This is set true just before isLoading is set false. Therefore it is true during
    // the initial render that actually creates the main swiper, and through (typically) a few
    // more before things stabilize. It is cleared at the end of a timeout in finishUp() when
    // we are ready to start any audio or animation. Its purpose is twofold:
    // - during this phase, we want to force swiper to be on the desired startPage.
    // Once we're done with that process, we want to allow it to move.
    // - during this phase, we typically get notifications that swiper is on, or moving to,
    // the current page. These normally trigger audio and animation-related side effects. We don't
    // want those until we're ready to start.
    // Note: this is very similar to the !state.isFinishUpForNewBookComplete but at the moment
    // the latter doesn't get set false when we get a new URL (which might be a bug).
    // We don't need this to be state because we don't need a new render when it changes.
    // It might be a good thing to combine them somehow.
    private startingUpSwiper = true;

    constructor(props: IProps, state: IState) {
        super(props, state);
        // Make this player (currently always the only one) the recipient for
        // notifications from narration.ts etc about duration etc.
        BloomPlayerCore.currentPagePlayer = this;
        this.legacyQuestionHandler = new LegacyQuestionHandler(
            props.locationOfDistFolder
        );
    }

    public readonly state: IState = {
        pages: this.initialPages,
        pageIdToIndexMap: {},
        styleRules: this.initialStyleRules,
        importedBodyAttributes: {},
        currentSwiperIndex: 0,
        isLoading: true,
        loadFailed: false,
        loadErrorHtml: "",
        ignorePhonyClick: false,
        isFinishUpForNewBookComplete: false,
        inPauseForced: false
    };

    // The book url we were passed as a URL param.
    // May be a full url of the html file (eventually, typically, index.htm);
    // in this case, it must end with .htm (currently we do NOT support .html).
    // May be a url of a folder whose name is the book title, where the book has the same name,
    // e.g., .../X means the book is .../X/X.htm (NOT X.html)
    private sourceUrl: string;
    // The folder containing the html file.
    private urlPrefix: string;

    private metaDataObject: any | undefined;
    private htmlElement: HTMLHtmlElement | undefined;

    private animation: Animation;
    private music: Music;
    private video: Video;
    private videoList: string; // determined only if this.props.shouldReportSoundLog.

    private isPagesLocalized: boolean = false;

    private static currentPage: HTMLElement | null;
    private static currentPageIndex: number;
    private static currentPageHasVideo: boolean;
    private currentPageHidesNavigationButtons: boolean = false;

    private indexOflastNumberedPage: number;

    public componentDidMount() {
        LocalizationManager.setUp();

        window.addEventListener("focus", () => this.handleWindowFocus());
        window.addEventListener("blur", () => this.handleWindowBlur());

        // To get this to fire consistently no matter where the focus is,
        // we have to attach to the document itself. No level of react component
        // seems to work (using the OnKeyDown prop). So we use good ol'-fashioned js.
        document.addEventListener("keydown", e =>
            this.handleDocumentLevelKeyDown(e)
        );

        // Clicking on any element that has a data-href attribute will be treated as a link.
        // This is the simplest way to handle such links that may be scattered on different
        // types of elements throughout the book.  See BL-13879.
        document.addEventListener("click", e =>
            this.handleDocumentLevelClick(e)
        );

        // We only need to add these body-level listeners once.
        // I can't find any clear documentation on whether we need all of these or just the pointer ones.
        for (const eventName of [
            "mousedown",
            "mousemove",
            "pointerdown",
            "pointermove",
            "touchstart",
            "touchmove"
        ]) {
            // The purpose of this is to prevent Swiper allowing the page to be moved or
            // flicked when the user is trying to click on a video control.
            // Unfortunately it does not work to put a handler on these events for the control itself.
            // Apparently the Swiper is capturing them before they get to the choice.
            // So we capture them at a higher level still, but only stop propagation if
            // in one of the choices.
            document.body.addEventListener(eventName, handleInputMouseEvent, {
                capture: true
            });
        }

        // March 2020 - Andrew/JohnH got confused about this line because 1) we don't actually *know* the
        // previous props & state, so it's a bit bogus (but it does work), and 2) when we remove it
        // everything still works (but there could well be some state that we didn't test). So we're leaving
        // it in.
        this.componentDidUpdate(this.props, this.state);
        const host = getQueryStringParamAndUnencode("host");
        if (host === "bloomdesktop") {
            // needed only for GeckoFx60. (We hope no one else is still running FF 60!)
            // To test this in storybook:
            // - use the "Activity that leads to FF60 split page";
            // - use Firefox 60, initially you should see the problem when advancing to second page
            // - inspect and add "&host=bloomdesktop" to the source of the storybook iframe to see the fix.
            // or, of course, you can try it actually in Bloom desktop.
            setTimeout(() => this.repairFF60Offset(), 2000);
        }
    }

    handleDocumentLevelClick(e: any) {
        const targetElement = (e.target as HTMLElement).closest(
            "[data-href]"
        ) as HTMLElement;
        if (targetElement && targetElement.attributes["data-href"]) {
            const href = targetElement.attributes["data-href"].value as string;
            if (href) {
                if (href.startsWith("#")) {
                    // This is a link to a page in the book.  We can handle going there.
                    const pageId = href.substring(1);
                    const pageIndex = this.state.pageIdToIndexMap[pageId];
                    if (pageIndex !== undefined) {
                        this.swiperInstance?.slideTo(pageIndex);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                } else if (href.startsWith("bloomnav://")) {
                    // This is a link to a page in another book. We need to send a message to the host.
                    sendMessageToHost({ messageType: "bloomnav", href: href });
                    e.preventDefault();
                    e.stopPropagation();
                } else if (
                    href.startsWith("http://") ||
                    href.startsWith("https://")
                ) {
                    // This is a generic external link. We open it in a new window or tab.
                    // (The host possibly could intercept this and open a browser to handle it.)
                    window.open(href, "_blank", "noreferrer");
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }
    }

    private handleWindowFocus() {
        const readDuration = localStorage.getItem(kLocalStorageDurationKey);
        const savedBookUrl = localStorage.getItem(kLocalStorageBookUrlKey);

        if (readDuration && savedBookUrl == this.sourceUrl) {
            this.bookInteraction.beginReadTime =
                Date.now() - parseInt(readDuration, 10);
        }
    }

    private handleWindowBlur() {
        const readDuration = Date.now() - this.bookInteraction.beginReadTime;

        localStorage.setItem(kLocalStorageDurationKey, readDuration.toString());
        localStorage.setItem(kLocalStorageBookUrlKey, this.sourceUrl);
    }

    // This horrible hack attempts to fix the worst effects of BL-8900. Basically, something inside
    // a widget iframe sometimes causes the wrapper that holds the whole collection of pages to scroll
    // over to be out of position. It appears to be related to an unknown bug in FF60...a very nasty one
    // since anything happening inside an iframe should not be able to affect its size, position, or
    // anything outside it (except with the deliberate cooperation of the host page). We have not found
    // any good way to stop it happening, but this basically compensates for it and puts the current page
    // back where it belongs. Our theory is that the problem occurs when the activity finishes loading,
    // typically sometime after the page before it becomes the 'current' page and the activity itself is
    // therefore the 'next' page and no longer blocked by laziness.
    // Observed cases take about 2s for the problem to appear on a fast computer
    // with a good internet. To be fairly sure of catching it if it happens, but not keep using power
    // doing this forever, we monitor for it for 30s.
    // Note that the initial call that starts this checking process only happens if we are invoked
    // from bloomdesktop. Otherwise, this function will never be called at all.
    private repairFF60Offset() {
        try {
            let wrapper = document.getElementsByClassName(
                "swiper-wrapper"
            )[0] as HTMLElement;
            let current = document.getElementsByClassName(
                "swiper-slide-active"
            )[0] as HTMLElement;
            if (wrapper && current && this.msToContinueFF60RepairChecks > 0) {
                let error =
                    wrapper.parentElement!.getBoundingClientRect().left -
                    current.getBoundingClientRect().left;
                if (Math.abs(error) > 1) {
                    const scale =
                        wrapper.getBoundingClientRect().width /
                        wrapper.offsetWidth;
                    const paddingPx = wrapper.style.paddingLeft;
                    const padding =
                        paddingPx.length === 0
                            ? 0
                            : parseFloat(
                                  paddingPx.substring(0, paddingPx.length - 2)
                              );
                    wrapper.style.paddingLeft = padding + error / scale + "px";
                }
            }
        } catch (_) {
            // If something goes wrong with this...oh well, we tried, and on most
            // browsers we didn't need it anyway.
        }
        this.msToContinueFF60RepairChecks -= 100;
        setTimeout(() => this.repairFF60Offset(), 100);
    }

    // This stores a number of milliseconds during which we should continue to check repeatedly
    // for the FF60 problem described above. It is set to zero when checking should be disabled
    // (e.g., during drag or animation) and to a substantial number after we change pages.
    // Then it gets decremented in repairFF60Offset, and eventually decrements to zero so we
    // don't consume extra power forever doing this check.
    private msToContinueFF60RepairChecks = 0;

    private handleDocumentLevelKeyDown = e => {
        if (e.key === "Home") {
            this.goToFirstPage();
            e.preventDefault();
        }
        if (e.key === "End") {
            this.goToLastPage();
            e.preventDefault();
        }
    };
    private distributionSource = "";

    // We expect it to show some kind of loading indicator on initial render, then
    // we do this work. For now, won't get a loading indicator if you change the url prop.
    public componentDidUpdate(prevProps: IProps, prevState: IState) {
        try {
            if (this.state.loadFailed) {
                return; // otherwise we'll just be stuck in here forever trying to load
            }
            // also one-time setup; only the first time through
            this.initializeMedia();

            const newSourceUrl = this.preprocessUrl();
            // Inside of Bloom Publish Preview,
            // this will be "" if we should just keep spinning, waiting for a render with different
            // props once the bloomd is created.

            if (newSourceUrl && newSourceUrl !== this.sourceUrl) {
                this.finishUpCalled = false;
                // We're changing books; reset several variables including isLoading,
                // until we inform the controls which languages are available.
                this.setState({ isLoading: true, loadFailed: false });
                this.metaDataObject = undefined;
                this.htmlElement = undefined;

                this.sourceUrl = newSourceUrl;
                // We support a two ways of interpreting URLs.
                // If the url ends in .htm, it is assumed to be the URL of the htm file that
                // is the book itself. The last slash indicates the folder in which all the
                // other resources may be found.
                // For compatibility with earlier versions of bloom-player, the url may be a folder
                // ending in the book name, and the book is assumed to occur in that folder and have
                // the same name as the folder.
                // Note: In the future, we are thinking of limiting to
                // a few domains (localhost, dev.blorg, blorg).
                // Note: we don't currently look for .html files, only .htm. That's what
                // Bloom has consistently created, both in .bloomd files and in
                // book folders, so it doesn't seem worth complicating the code
                // to look for the other as well.
                const slashIndex = this.sourceUrl.lastIndexOf("/");
                const encodedSlashIndex = this.sourceUrl.lastIndexOf("%2f");
                let filename: string;
                if (slashIndex > encodedSlashIndex) {
                    filename = this.sourceUrl.substring(
                        slashIndex + 1,
                        this.sourceUrl.length
                    );
                } else {
                    filename = this.sourceUrl.substring(
                        encodedSlashIndex + 3,
                        this.sourceUrl.length
                    );
                }
                // Note, The current best practice is actually to have the htm file always be "index.htm".
                // Most (all?) bloom-player hosts are already looking for that, then looking for a name
                // matching the zip file's name, then going with the first.
                const haveFullPath = filename.endsWith(".htm");
                const haveBlobPath = this.sourceUrl.startsWith("blob:");
                const urlOfBookHtmlFile =
                    haveFullPath || haveBlobPath
                        ? this.sourceUrl
                        : this.sourceUrl + "/" + filename + ".htm";

                this.urlPrefix = haveFullPath
                    ? this.sourceUrl.substring(
                          0,
                          Math.max(slashIndex, encodedSlashIndex)
                      )
                    : this.sourceUrl;
                this.music.urlPrefix = this.urlPrefix;
                setPlayerUrlPrefix(this.music.urlPrefix);
                // Note: this does not currently seem to work when using the storybook fileserver.
                // I hypothesize that it automatically filters files starting with a period,
                // so asking for .distribution fails even if the local book folder (e.g., Testing
                // away again) contains a .distribution file. I just tested using a book locally
                // published through the Bloom Editor server.
                const distributionUrl =
                    this.props.distributionUrl || this.fullUrl(".distribution");
                const distributionPromise = axios.get(distributionUrl).then(
                    result => {
                        return result;
                    },
                    // Very possibly the BloomPUB doesn't have this file. The only way to find this
                    // out is by the request failing. We don't consider this a 'real' failure and
                    // just fulfil the promise with an object indicating that distribution is an
                    // empty string.
                    error => {
                        return { data: "" };
                    }
                );
                const htmlPromise = axios.get(urlOfBookHtmlFile);
                const metaJsonUrl =
                    this.props.metaJsonUrl || this.fullUrl("meta.json");
                const metadataPromise = axios.get(metaJsonUrl);
                Promise.all([htmlPromise, metadataPromise, distributionPromise])
                    .then(result => {
                        const [
                            htmlResult,
                            metadataResult,
                            distributionResult
                        ] = result;
                        this.metaDataObject = metadataResult?.data;
                        this.distributionSource = (distributionResult as any).data;
                        // Note: we do NOT want to try just making an HtmlElement (e.g., document.createElement("html"))
                        // and setting its innerHtml, since that leads to the browser trying to load all the
                        // urls referenced in the book, which is a waste and also won't work because we
                        // haven't corrected them yet, so it can trigger yellow boxes in Bloom.
                        const parser = new DOMParser();
                        // we *think* bookDoc and bookHtmlElement get garbage collected
                        const bookDoc = parser.parseFromString(
                            htmlResult?.data,
                            "text/html"
                        );
                        const bookHtmlElement = bookDoc.documentElement as HTMLHtmlElement;

                        const body = bookHtmlElement.getElementsByTagName(
                            "body"
                        )[0];

                        this.bookInfo.setSomeBookInfoFromBody(body);
                        // contains conditions to limit this to one time only after assembleStyleSheets has completed.
                        // Requires bookInfo data, so we must do it after we initialize that.
                        this.localizeOnce();

                        // shouldReportSoundLog is characteristic of using BP to make a video in BloomEditor.
                        // When doing that, if there are any videos in the input, we need to report them to BE
                        // so it can check whether they contain audio that will be lost.
                        if (this.props.shouldReportSoundLog) {
                            this.videoList = this.getVideoList(bookDoc);
                        }

                        this.animation.PlayAnimations = this.bookInfo.playAnimations;

                        this.collectBodyAttributes(body);
                        this.makeNonEditable(body);
                        this.htmlElement = bookHtmlElement;

                        const firstPage = bookHtmlElement.getElementsByClassName(
                            "bloom-page"
                        )[0];
                        this.originalPageClass = "Device16x9Portrait";
                        if (firstPage) {
                            this.originalPageClass = BloomPlayerCore.getPageSizeClass(
                                firstPage
                            );
                        }
                        // enhance: make this callback thing into a promise
                        this.legacyQuestionHandler.generateQuizPagesFromLegacyJSON(
                            this.urlPrefix,
                            body,
                            this.originalPageClass,
                            () => {
                                this.finishUp();
                            }
                        );
                    })
                    .catch(err => this.HandleLoadingError(err));
            } else if (
                // Still the same book, we've already loaded the page data. But we may need to adjust the orientation
                // class on each (nontrivial) page if
                // - the device got rotated (or the window size changed in a way that has the same effect)
                prevProps.landscape !== this.props.landscape ||
                // - something has changed the other part of the page size class; may have messed up the orientation part
                //   in the process
                prevProps.useOriginalPageSize !==
                    this.props.useOriginalPageSize ||
                // - autoplay changed...this results in a new instance of slider containing new dom elements
                //   made from the original HTML which may need fresh adjustment (BL-11090)
                prevProps.autoplay !== this.props.autoplay
            ) {
                const pages = document.getElementsByClassName("bloom-page");
                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i];
                    this.setPageSizeClass(page);
                }
            }

            // This is likely not the most efficient way to do this. Ideally, we would set the initial language code
            // on the initial pass. But the complexity was overwhelming, so we settled for what works.
            if (
                !this.state.isLoading &&
                // First time after loaded - at this point, we know we are ready to get at the dom
                // BL-9307 we lost this case in a refactor, by the time we are loaded
                // prevProps.activeLanguageCode has already been setup, so we never hit the initial run.
                // See Storybook story: "Multilingual motion book - initial language set to 'ko'"
                (prevState.isLoading ||
                    // If the user changes the language code in the picker
                    prevProps.activeLanguageCode !==
                        this.props.activeLanguageCode)
            ) {
                this.updateDivVisibilityByLangCode(prevState.isLoading);
                this.updateOverlayPositionsByLangCode();
                // If we have previously called finishup, we need to call it again to set the swiper pages correctly.
                // If we haven't called it, it will get called subsequently.
                if (this.finishUpCalled) {
                    this.finishUp(false); // finishUp(false) just reloads the swiper pages from our stored html
                }
            }
            if (this.state.currentSwiperIndex != prevState.currentSwiperIndex) {
                // Doing this cleanup is unfortunate overhead, but niceScrolls stick around too much,
                // including when the page divs they are on are removed because the page is not the
                // previous, current, or next page. This leads to performance issues.
                // We thought about making things more complex to only remove them for divs which
                // are being removed from the dom, but experimentation shows that running the below
                // takes almost no time (usually < 1 millisecond), so it didn't seem worth it.
                // Note that we can do this here because showingPage() is going to come along
                // for each page change and add any needed niceScrolls anyway. See BL-11070.
                this.rootDiv
                    ?.querySelectorAll(kSelectorForPotentialNiceScrollElements)
                    .forEach(group => {
                        // The type definition is not correct for getNiceScroll; we expect it to return an array.
                        const groupNiceScroll = $(group).getNiceScroll() as any;
                        if (groupNiceScroll && groupNiceScroll.length > 0) {
                            groupNiceScroll.remove();
                        }
                    });
            }

            // If the user changes the image description button on the controlbar
            // Review JohnT: I don't see why we want to do this simply on a transition from loading
            // to not-loading. We already do it on a timeout in the code that sets loading to false,
            // and we suppress effects on setIndex and showingPage until that timeout completes and
            // calls them. So I think it would be safe to remove the prevState.isLoading || condition.
            if (
                !this.state.isLoading &&
                (prevState.isLoading ||
                    prevProps.shouldReadImageDescriptions !==
                        this.props.shouldReadImageDescriptions)
            ) {
                if (this.finishUpCalled) {
                    // We need to reset the page enough to get the narration rebuilt.
                    // console.log(
                    //     "setting index and page to " +
                    //         this.state.currentSwiperIndex +
                    //         " because shouldReadImageDescriptions changed"
                    // );
                    this.setIndex(this.state.currentSwiperIndex);
                    this.showingPage(this.state.currentSwiperIndex);
                }
            }

            if (
                this.state.isFinishUpForNewBookComplete &&
                prevProps.landscape !== this.props.landscape
            ) {
                // if there was a rotation, we may need to show the page differently (e.g. Motion books)
                // console.log(
                //     "setting index and page to " +
                //         this.state.currentSwiperIndex +
                //         " because orientation changed"
                // );
                this.setIndex(this.state.currentSwiperIndex);
                this.showingPage(this.state.currentSwiperIndex);
            }

            if (prevProps.paused !== this.props.paused) {
                this.handlePausePlay();
            }
            if (this.swiperInstance) {
                // Other refactoring seems to have fixed an earlier problem with switching orientation,
                // so that we no longer need either the Swiper update or even the setTimeout here.
                // OTOH, we need to do a lazy.load(), otherwise all our pictures disappear when changing languages!
                this.swiperInstance.lazy.load();
            }
        } catch (error) {
            this.setState({
                isLoading: false,
                loadFailed: true,
                loadErrorHtml: error.message
            });
        }
    }

    // nicescroll doesn't properly scale the padding at the top and left of the
    // scrollable area of the languageGroup divs when the page is scaled.  This
    // method sets offset values to correct for this.  It is called whenever the
    // entire window resizes, which also scales the page before this is called.
    // See BL-13796.
    public static fixNiceScrollOffsets(page: HTMLElement, scale: number) {
        page.querySelectorAll(kSelectorForPotentialNiceScrollElements).forEach(
            group => {
                // The type definition is not correct for getNiceScroll; we expect it to return an array.
                const groupNiceScroll = $(group).getNiceScroll() as any;
                if (groupNiceScroll && groupNiceScroll.length > 0) {
                    let {
                        topAdjust,
                        leftAdjust
                    } = BloomPlayerCore.ComputeNiceScrollOffsets(
                        scale,
                        group as HTMLElement
                    );
                    groupNiceScroll[0].opt.railoffset.top = -topAdjust;
                    groupNiceScroll[0].opt.railoffset.left = -leftAdjust;
                    groupNiceScroll[0].resize();
                }
            }
        );
    }

    private collectBodyAttributes(originalBodyElement: HTMLBodyElement) {
        // When working on the ABC-BARMM branding/XMatter pack, we discovered that the classes on the
        // Desktop body element were not getting passed into bloom-player.
        // Unfortunately, just putting them on the body element doesn't work because we are using
        // scoped styles. So we put them on the div.bloomPlayer-page (and then we have to adjust the rules
        // so they'll work there).
        // Other xmatter uses other info than classes. E.g. Kyrgystan uses the data-bookshelfurlkey attribute
        // to control the background color.

        // convert from the NamedNodeMap to a simple object:
        var x = {};
        for (var i = 0; i < originalBodyElement.attributes.length; i++) {
            x[
                originalBodyElement.attributes.item(i)!.nodeName
            ] = originalBodyElement.attributes.item(i)!.nodeValue;
        }
        this.setState({
            importedBodyAttributes: x
        });
    }

    private HandleLoadingError(axiosError: any) {
        const errorMessage = axiosError.message as string;
        // Note: intentionally no bothering to add this to the l10n load, at this time.
        let msg = `<p>There was a problem displaying this book: ${errorMessage}<p>`; // just show the raw thing
        // If it's a file:/// url, we're probably on an Android, and something
        // went wrong with unpacking it, or it is corrupt. This typically results in an error
        // message that is NOT a 404 but IS reported, unhelpfully, as a "Network Error" (BL-7813).
        // A file:/// url can't possibly be a network error, so the "part of the book is missing"
        // error is at least a little more helpful, maybe to the user, and certainly to a developer
        // trying to fix the problem, especially if the user reports the problem URL.
        const localFileMissing =
            axiosError.config &&
            axiosError.config.url &&
            axiosError.config.url.startsWith("file://");
        if (localFileMissing || axiosError.message.indexOf("404") >= 0) {
            msg = "<p>This book (or some part of it) was not found.<p>";
            if (axiosError.config && axiosError.config.url) {
                msg += `<p class='errorDetails'>${htmlEncode(
                    axiosError.config.url
                )}</p>`;
            }
        }
        this.setState({
            isLoading: false,
            loadFailed: true,
            loadErrorHtml: msg
        });
    }

    private finishUpCalled = false;
    private hasImageDescriptions = false;

    // This function, the rest of the work we need to do, will be executed after we attempt
    // to retrieve questions.json and either get it and convert it into extra pages,
    // or fail to get it and make no changes.
    // We also call this method when changing the language, but we only want it to update the swiper content
    private async finishUp(isNewBook: boolean = true) {
        this.finishUpCalled = true;

        // assemble the page content list
        if (!this.htmlElement) {
            return;
        }
        const pages = this.htmlElement.getElementsByClassName("bloom-page");
        const swiperContent: string[] = [];
        if (isNewBook) {
            this.bookInfo.totalNumberedPages = 0;
            this.bookInfo.questionCount = 0;
            this.activityManager.collectActivityContextForBook(pages);
            this.bookInteraction.clearPagesShown();
            this.music.processAllMusicForBook(pages);
        }

        const bookLanguages = this.bookInfo.getPreferredTranslationLanguages();
        const usingDefaultLang =
            bookLanguages[0] === this.props.activeLanguageCode ||
            !this.props.activeLanguageCode;

        const pageMap = {};

        // implementation of hasActivities and hasAnimation, if we decide we need them.
        // const pagesArray = Array.from(pages);
        // const hasActivities = pagesArray.some(p =>
        //     p.classList.contains("bloom-interactive-page")
        // );
        // const hasAnimation = pagesArray.some(p =>
        //     Animation.pageHasAnimation(p as HTMLDivElement)
        // );

        // This implementation should be kept consistent with the HtmlDom.HasActivityPages() method
        // in Bloom Editor.
        const isActivityPage = (page: HTMLElement) => {
            return (
                page.classList.contains("bloom-interactive-page") ||
                // Some of these are for older approaches to quizzes and could possibly be retired.
                page.classList.contains("simple-comprehension-quiz") ||
                page.getAttribute("data-activity") == "iframe" ||
                page.getElementsByClassName("questions").length > 0
            );
        };

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i] as HTMLElement;
            const pageId = page.getAttribute("id");
            if (pageId) {
                pageMap[pageId] = i;
            }
            const landscape = this.setPageSizeClass(page);

            // this used to be done for us by react-slick, but swiper does not.
            // Since it's used by at least page-api code, it's easiest to just stick it in.
            page.setAttribute("data-index", i.toString(10));
            // Now we have all the information we need to call reportBookProps if it is set.
            if (i === 0 && this.props.reportBookProperties) {
                // Informs containing react controls (in the same frame)
                this.props.reportBookProperties({
                    landscape,
                    //hasActivities,
                    //hasAnimation,
                    canRotate: this.bookInfo.canRotate,
                    preferredLanguages: bookLanguages,
                    // We pass these up to the client, typically for use in the page number control.
                    // This allows the page numbers it shows as labels to reflect the actual page numbers shown on the
                    // page, which typically don't correspond to the page index, since xmatter pages are not numbered.
                    pageNumbers: Array.from(pages).map(
                        p => p.getAttribute("data-page-number") ?? ""
                    ),
                    isRtl: this.metaDataObject.isRtl
                });
            }
            if (isNewBook) {
                this.fixRelativeUrls(page);
                // possibly more efficient to look for attribute data-page-number,
                // but due to a bug (BL-7303) many published books may have that on back-matter pages.
                const hasPageNum = page.classList.contains("numberedPage");
                if (hasPageNum) {
                    this.indexOflastNumberedPage = i;
                    this.bookInfo.totalNumberedPages++;
                }
                if (
                    (page.getAttribute("data-analyticscategories") ||
                        page.getAttribute("data-analyticsCategories")) ===
                    "comprehension"
                ) {
                    // Note that this will count both new-style question pages,
                    // and ones generated from old-style json.
                    this.bookInfo.questionCount++;
                }
            }
            this.showOrHideL1OnlyText(page, usingDefaultLang);

            // look for activities on this page
            const isActivity = isActivityPage(page);
            if (isActivity)
                this.activityManager.initializePageHtml(
                    this.urlPrefix,
                    page,
                    swiperContent.length
                );

            if (
                // Enhance: if we decide to skip activities without hiding the random-access page chooser,
                // we need to remove the relevant numbers from there, too.
                !this.props.skipActivities ||
                !isActivity
            ) {
                swiperContent.push(page.outerHTML);
            }
        }
        if (isNewBook) {
            const head = this.htmlElement.getElementsByTagName("head")[0];
            this.bookInfo.setSomeBookInfoFromHead(head); // prep for reportBookOpened()
            const body = this.htmlElement.getElementsByTagName("body")[0];
            if (this.metaDataObject) {
                this.bookInfo.setSomeBookInfoFromMetadata(
                    this.metaDataObject,
                    body
                );
                this.reportBookOpened(body);
            }
            if (this.props.controlsCallback) {
                const languages = LangData.createLangDataArrayFromDomAndMetadata(
                    body,
                    this.metaDataObject
                );
                this.hasImageDescriptions = doesBookHaveImageDescriptions(body);
                // Tell BloomPlayerControls which languages are available for the Language Menu
                // and whether or not to bother with the readImageDescriptions toggle.
                this.props.controlsCallback(
                    languages,
                    this.hasImageDescriptions,
                    (pageNumber: number) => {
                        this.swiperInstance?.slideTo(pageNumber);
                    }
                );
            }
        }

        // Make sure you only set state.styleRules once per book.
        // Otherwise, it wreaks havoc on scoped styles. See BL-9504.
        if (isNewBook) {
            const combinedStyle = await this.assembleStyleSheets(
                this.htmlElement
            );
            // We're about to start rendering with isLoading false. That means the spinning circle is
            // replaced with a swiper control showing the actual book contents. We need to do certain
            // things differently while swiper is getting stabilized on the first page; this gets set
            // false again after the timeout just below here.
            this.startingUpSwiper = true;
            // assembleStyleSheets takes a while, fetching stylesheets. We can't render properly until
            // we get them, so we wait for the results and then make all the state changes in one go
            // to minimize renderings. (Because all this is happening asynchronously, not within the
            // original componentDidUpdate method call, each setState results in an immediate render.)
            this.setState({
                pages: swiperContent,
                pageIdToIndexMap: pageMap,
                styleRules: combinedStyle,
                isLoading: false,
                currentSwiperIndex: this.props.startPage ?? 0
            });
        } else {
            this.setState({
                pages: swiperContent,
                isLoading: false
            });
        }

        this.props.pageStylesAreNowInstalled();
        // A pause hopefully allows the document to become visible before we
        // start playing any audio or movement on the first page.
        // Also gives time for the first page element and the buttons we want
        // to mess with here to actually get created in the document.
        // Note: typically in Chrome we won't actually start playing, because
        // of a rule that the user must interact with the document first.
        if (isNewBook) {
            window.setTimeout(() => {
                this.setState({ isFinishUpForNewBookComplete: true });
                this.startingUpSwiper = false; // transition phase is over

                var startPage = this.props.startPage ?? 0;
                // console.log(
                //     "setting index and page to " +
                //         startPage +
                //         " in timeout for new book"
                // );
                // These are normally side effects of swiper showing and preparing to show a certain page.
                // We've suppressed them until now (by means of startingUpSwiper) to let things stabilize
                // before we start audio, animation, etc., which are side effects of calling them.
                // Now we want all that to happen.
                this.setIndex(startPage);
                this.showingPage(startPage);
                //This allows a user to tab to the prev/next buttons, and also makes the focus() call work
                const nextButton = document.getElementsByClassName(
                    "swiper-button-next"
                )[0] as HTMLElement;
                const prevButton = document.getElementsByClassName(
                    "swiper-button-prev"
                )[0] as HTMLElement;

                prevButton?.setAttribute("tabindex", "4");
                nextButton?.setAttribute("tabindex", "5");
                // The most likely thing the user wants to do next, but also,
                // we need to focus something in the reader to make the arrow keys
                // work immediately.
                nextButton?.focus();
            }, 500);
        } else {
            if (BloomPlayerCore.currentPage) {
                window.setTimeout(() => {
                    // Presumably, the language was just changed.
                    // Reset the index / re-show the page
                    // Even though we're setting it to the same index, setIndex and showingPage have other useful/necessary side effects such as:
                    // * Replace BloomPlayerCore.currentPage with the new page created from the updated content
                    // * Update the Play/Pause button visibility based on the new language
                    // * Stops the playback of the old language's audio (if in Play mode)
                    // * Starts the playback of the new language's audio (if in Play mode)
                    // * Update whether scrollbars should appear
                    // * etc.
                    this.setIndex(BloomPlayerCore.currentPageIndex);
                    this.showingPage(BloomPlayerCore.currentPageIndex);
                }, 200);
            }
        }
    }

    // If a book is displayed in some language other than the one it was primarily published in,
    // We don't show the topic or the book language, because we are only able to display
    // them in L1, and in fact the language would be wrong. So if the user changes languages,
    // we hide the incorrect language and the topic. BL-11133.
    //
    // Don't be tempted to achieve this by returning conditionally created rules from assembleStyleSheets.
    // That was our original implementation, but if state.styleRules gets set more than once for a book,
    // it wreaks havoc on scoped styles. See BL-9504.
    private showOrHideL1OnlyText(page: Element, show: boolean) {
        page.querySelectorAll(
            ".coverBottomBookTopic, .coverBottomLangName"
        ).forEach(elementToShowOrHide => {
            // bloom-content1 should never be hidden here, nor should anything if show is true.
            if (
                show ||
                elementToShowOrHide.classList.contains("bloom-content1")
            ) {
                elementToShowOrHide.classList.remove("do-not-display");
            } else {
                elementToShowOrHide.classList.add("do-not-display");
            }
        });
    }

    private localizeOnce() {
        // We want to localize once and only once after pages has been set and assembleStyleSheets has happened.
        if (
            !this.isPagesLocalized &&
            this.state.pages !== this.initialPages &&
            this.state.styleRules !== this.initialStyleRules
        ) {
            LocalizationManager.localizePages(
                document.body,
                this.bookInfo.getPreferredTranslationLanguages()
            );
            this.isPagesLocalized = true;
        }
    }

    // We need named functions for each LiteEvent handler, so that we can unsubscribe them
    // when we are about to unmount.
    private handlePageVideoComplete = pageVideoData => {
        // Verify we're on the current page before playing audio (BL-10039)
        // If the user if flipping pages rapidly, video completed events can overlap.
        if (pageVideoData!.page === BloomPlayerCore.currentPage) {
            this.playAudioAndAnimation(pageVideoData!.page); // play audio after video finishes
        }
    };

    private handlePlayFailed = () => {
        this.setState({ inPauseForced: true });
        if (this.props.setForcedPausedCallback) {
            this.props.setForcedPausedCallback(true);
        }
    };

    private handlePlayCompleted = () => {
        setCurrentPlaybackMode(PlaybackMode.MediaFinished);
        this.props.imageDescriptionCallback(false); // whether or not we were before, now we're certainly not playing one.
    };

    private handleToggleImageDescription = (inImageDescription: boolean) => {
        this.props.imageDescriptionCallback(inImageDescription);
    };

    private initializeMedia() {
        // The conditionals guarantee that each type of media will only be created once.
        // N.B. If you add any new LiteEvent subscriptions, don't forget to unsubscribe in
        // unsubscribeAllEvents().
        if (!this.video) {
            this.video = new Video();
            this.video.PageVideoComplete = new LiteEvent<IPageVideoComplete>();
            this.video.PageVideoComplete.subscribe(
                this.handlePageVideoComplete
            );
        }
        if (!this.animation) {
            this.animation = new Animation();
        }

        PageNarrationComplete.subscribe(this.handlePageNarrationComplete);
        PlayFailed.subscribe(this.handlePlayFailed);
        PlayCompleted.subscribe(this.handlePlayCompleted);
        listenForPlayDuration(this.storeAudioAnalytics.bind(this));
        ToggleImageDescription.subscribe(
            this.handleToggleImageDescription.bind(this)
        );
        // allows narration to ask whether swiping to this page is still in progress.
        // This doesn't seem to be super reliable, so that narration code also keeps track of
        // how long it's been since we switched pages.
        setTestIsSwipeInProgress(() => {
            return this.swiperInstance?.animating;
        });
        setLogNarration(url => logSound(url, 1));

        if (!this.music) {
            this.music = new Music();
            this.music.PlayFailed = new LiteEvent<HTMLElement>();
            this.music.PlayFailed.subscribe(() => {
                this.setState({ inPauseForced: true });
                if (this.props.setForcedPausedCallback) {
                    this.props.setForcedPausedCallback(true);
                }
            });
        }
    }

    // a collection of things for cleaning up the url
    private preprocessUrl(): string {
        let url = this.props.url;
        if (url === undefined || "" === url.trim()) {
            throw new Error(
                "The url parameter was empty. It should point to the url of a book."
            );
        }
        // Bloom Publish Preview uses this so that we get spinning wheel while working on making the bloomd
        if (url === "working") {
            return "";
        }

        // Folder urls often (but not always) end in /. If so, remove it, so we don't get
        // an empty filename or double-slashes in derived URLs.
        if (url.endsWith("/")) {
            url = url.substring(0, url.length - 1);
        }
        // Or we might get a url-encoded slash.
        if (url.endsWith("%2f")) {
            url = url.substring(0, url.length - 3);
        }
        return url;
    }

    private handlePausePlay() {
        // props indicates the state we want to be in, typically from the BloomPlayerControls state.
        // Calling this method indicates we are not in that state, so we need to change it to match.
        if (this.props.paused) {
            this.pauseAllMultimedia();
        } else {
            // This test determines if we changed pages while paused,
            // since the narration object won't yet be updated.
            if (
                BloomPlayerCore.currentPage !== getCurrentNarrationPage() ||
                currentPlaybackMode === PlaybackMode.MediaFinished
            ) {
                this.resetForNewPageAndPlay(BloomPlayerCore.currentPage!);
            } else {
                if (currentPlaybackMode === PlaybackMode.VideoPaused) {
                    this.video.play(); // sets currentPlaybackMode = VideoPlaying
                } else {
                    playNarration(); // sets currentPlaybackMode = AudioPlaying
                    this.animation.PlayAnimation();
                    this.music.play();
                }
            }
        }
    }

    private getAllPrimaryImageContainersOnPage() {
        const unfilteredContainers = this.htmlElement?.ownerDocument.getElementsByClassName(
            "bloom-imageContainer"
        );
        if (!unfilteredContainers) {
            return [];
        }
        return Array.from(unfilteredContainers).filter(
            (el: Element) =>
                el.parentElement!.closest(".bloom-imageContainer") === null
        ) as HTMLElement[];
    }

    private updateOverlayPositionsByLangCode(): void {
        if (!this.props.activeLanguageCode || !this.htmlElement) {
            return; // shouldn't happen, just a precaution
        }
        try {
            const langVernacular = this.props.activeLanguageCode;
            this.getAllPrimaryImageContainersOnPage().forEach(container => {
                Array.from(
                    container.getElementsByClassName("bloom-textOverPicture")
                ).forEach(top => {
                    const editable = Array.from(
                        top.getElementsByClassName("bloom-editable")
                    ).find(e => e.getAttribute("lang") === langVernacular);
                    if (editable) {
                        const alternatesString = editable.getAttribute(
                            "data-bubble-alternate"
                        );
                        if (alternatesString) {
                            const alternate = JSON.parse(
                                alternatesString.replace(/`/g, '"')
                            ) as IAlternate;
                            top.setAttribute("style", alternate.style);
                        }
                    }
                });
                // If we have an alternate SVG for this language, activate it.
                const altSvg = Array.from(
                    container.getElementsByClassName("comical-alternate")
                ).find(svg => svg.getAttribute("data-lang") === langVernacular);
                // if we don't find one, don't need to do anything.
                // Possibly this image container doesn't have overlays. Possibly
                // the right svg is already switched to be the active one. Possibly the
                // book was made by an older version of Bloom without multilingual overlay
                // support.
                if (altSvg) {
                    const currentSvg = container.getElementsByClassName(
                        "comical-generated"
                    )[0];
                    if (currentSvg) {
                        // should always be true
                        // demote it to alternate
                        currentSvg.classList.remove("comical-generated");
                        currentSvg.classList.add("comical-alternate");
                        (currentSvg as HTMLElement).style.display = "none";
                    }
                    // and promote the alternate to live
                    altSvg.classList.remove("comical-alternate");
                    altSvg.classList.add("comical-generated");
                    (altSvg as HTMLElement).style.removeProperty("display");
                }
            });
        } catch (ex) {
            // So, we can't position the bubbles just right. Shouldn't be too big a disaster.
            console.error(ex);
        }
    }

    // If a book is displayed in its original language, the author may well want to also see a title
    // in the corresponding national language. Typically default rules or author styles will make
    // the two titles appropriate sizes. And the original design of the book may support showing
    // two or even three languages in each content block.
    // When the user selects a different language, showing the published national language as well is
    // less appropriate. It may not be the national language of any country where the chosen language
    // is spoken. Worse, the book may have been published in a monolingual collection, where the
    // vernacular and national languages are the same. When a different language is chosen,
    // what was originally a single, possibly very large, title in the book's only language
    // suddenly becomes a (possibly smaller) title in the chosen language followed by a possibly
    // larger one in the original language (previously marked both bloom-content1 and
    // bloom-contentNational1, now with just the second class making it visible).
    // And the chosen language may take up more space than the original language, so bi- or tri-lingual
    // content blocks may overflow.
    // We decided (BL-9256) that in fields that display the book's primary language (V or auto),
    // if the user has chosen a different language, we will only show that chosen language.
    private updateDivVisibilityByLangCode(firstRunForThisBook: boolean): void {
        if (!this.props.activeLanguageCode || !this.htmlElement) {
            return; // shouldn't happen, just a precaution
        }

        const bookLanguages = this.bookInfo.getPreferredTranslationLanguages();
        const usingDefaultLang =
            bookLanguages[0] === this.props.activeLanguageCode ||
            !this.props.activeLanguageCode;

        // The newly selected language will be treated as the new, current vernacular language.
        // (It may or may not be the same as the original vernacular language at the time of publishing)
        const langVernacular = this.props.activeLanguageCode;

        // Update all the bloom-editables inside the translation group to take into account the new vernacular language
        const translationGroupDivs = this.htmlElement.ownerDocument!.evaluate(
            ".//div[contains(@class, 'bloom-translationGroup')]",
            this.htmlElement,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        const visibilityClass = "bloom-visibility-code-on";

        for (
            let iTranGrps = 0;
            iTranGrps < translationGroupDivs.snapshotLength;
            iTranGrps++
        ) {
            const groupElement = translationGroupDivs.snapshotItem(
                iTranGrps
            ) as HTMLElement;
            const dataDefaultLangsAttr = groupElement.getAttribute(
                "data-default-languages"
            );

            // Split the string into array form instead, using delimiters "," or " "
            const dataDefaultLangs = dataDefaultLangsAttr
                ? dataDefaultLangsAttr.split(/,| /)
                : [];
            const isVernacularBlock =
                dataDefaultLangs == null ||
                dataDefaultLangs.length === 0 ||
                !dataDefaultLangs[0] ||
                dataDefaultLangs.includes("V") ||
                dataDefaultLangs.includes("L1") ||
                BloomPlayerCore.areStringsEqualInvariantCultureIgnoreCase(
                    dataDefaultLangs[0],
                    "auto"
                );

            const childElts = groupElement.childNodes;
            for (let iEdit = 0; iEdit < childElts.length; iEdit++) {
                const divElement = childElts.item(iEdit) as HTMLDivElement;
                if (
                    !divElement ||
                    !divElement.classList ||
                    !divElement.classList.contains("bloom-editable")
                ) {
                    continue;
                }
                if (firstRunForThisBook) {
                    // Assume Bloom-desktop got it right for when usingDefaultLang. Save the classes it set.
                    // (But keep going...the first run might NOT be usingDefaultLang.)
                    divElement.setAttribute(
                        "data-original-class",
                        divElement.getAttribute("class") || ""
                    );
                }
                if (usingDefaultLang) {
                    // go back to the original classes from bloom desktop
                    divElement.setAttribute(
                        "class",
                        divElement.getAttribute("data-original-class") || ""
                    );
                } else if (isVernacularBlock) {
                    // only the one that matches activeLanguage should be visible
                    const lang = divElement.getAttribute("lang");
                    if (lang === langVernacular) {
                        divElement.classList.add(visibilityClass);
                        // We don't want any behavior triggered by things like bloom-contentNational1, for example.
                        // It may be that language, but in this state it's more important that it is the selected book language.
                        Array.from(divElement.classList).forEach(className => {
                            if (className.startsWith("bloom-content")) {
                                divElement.classList.remove(className);
                            }
                        });
                        // Depending on whether the field is controlled by the appearance system, one of these
                        // classes may activate style rules appropriate to the main book language.
                        divElement.classList.add("bloom-content1");
                        divElement.classList.add("bloom-contentFirst");
                    } else {
                        divElement.classList.remove(visibilityClass);
                        // We don't care about the other classes since it isn't going to be seen at all.
                    }
                }
                // (If it's not a vernacular block, the choices originally made by Bloom-desktop are still correct.)
                // (Well, there are a couple of exceptions, handled by showOrHideL1OnlyText)
            }
        }
    }

    private static areStringsEqualInvariantCultureIgnoreCase(
        a: string,
        b: string
    ) {
        return a.localeCompare(b, "en-US", { sensitivity: "accent" }) === 0;
    }

    private static isDivInL2(divElement: HTMLElement): boolean {
        return divElement.classList.contains("bloom-contentNational1");
    }

    private static isDivInL3(divElement: HTMLElement): boolean {
        return divElement.classList.contains("bloom-contentNational2");
    }

    public componentWillUnmount() {
        this.pauseAllMultimedia();
        document.removeEventListener("keydown", e =>
            this.handleDocumentLevelKeyDown(e)
        );
        this.unsubscribeAllEvents();
    }

    private unsubscribeAllEvents() {
        this.video.PageVideoComplete.unsubscribe(this.handlePageVideoComplete);
        PageNarrationComplete.unsubscribe(this.handlePageNarrationComplete);
        PlayFailed.unsubscribe(this.handlePlayFailed);
        PlayCompleted.unsubscribe(this.handlePlayCompleted);
        ToggleImageDescription.unsubscribe(this.handleToggleImageDescription);
    }

    private pauseAllMultimedia() {
        if (currentPlaybackMode === PlaybackMode.VideoPlaying) {
            this.video.pause(); // sets currentPlaybackMode = VideoPaused
        } else if (currentPlaybackMode === PlaybackMode.AudioPlaying) {
            pauseNarration(); // sets currentPlaybackMode = AudioPaused
            this.animation.PauseAnimation();
        }
        // Music keeps playing after all video, narration, and animation have finished.
        // Clicking on pause should pause the music, even though clicking on play will
        // then restart the video, narration, or animation while resuming the music where
        // it paused.  See https://issues.bloomlibrary.org/youtrack/issue/BL-9967.
        this.music.pause();
    }

    private reportBookOpened(body: HTMLBodyElement) {
        // Some facts about the book will go out with not just this event,
        // but also subsequent events. We call these "ambient" properties.
        const ambientProps = this.bookInfo.getAmbientAnalyticsProps();
        if (this.distributionSource) {
            ambientProps.distributionSource = this.distributionSource;
        }
        setAmbientAnalyticsProperties(ambientProps);
        reportAnalytics("BookOrShelf opened", {});
    }

    // Update the analytics report that will be sent (if not updated again first)
    // by our external container (Bloom Reader, Bloom Library, etc.)
    // when the parent reader determines that the session reading this book is finished.
    private sendUpdateOfBookProgressReportToExternalContext() {
        const properties = this.bookInteraction.getProgressReportPropertiesForAnalytics();
        // Pass the completed report to the externalContext version of this method which actually sends it.
        updateBookProgressReport("Pages Read", properties);
    }

    private makeNonEditable(body: HTMLBodyElement): void {
        // This is a preview, it's distracting to have it be editable.
        // (Should not occur in .bloomd, but might in books direct from BL.)
        const editable = body.ownerDocument!.evaluate(
            ".//*[@contenteditable]",
            body,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        for (let iedit = 0; iedit < editable.snapshotLength; iedit++) {
            (editable.snapshotItem(iedit) as HTMLElement).removeAttribute(
                "contenteditable"
            );
        }
    }

    private setPageSizeClass(page: Element): boolean {
        return BloomPlayerCore.setPageSizeClass(
            page,
            this.bookInfo.canRotate,
            this.props.landscape,
            this.props.useOriginalPageSize || this.bookInfo.hasFeature("comic"),
            this.originalPageClass
        );
    }

    public static getPageSizeClass(page: Element): string {
        const classAttr = page.getAttribute("class") || "";
        const matches = classAttr.match(/\b\S*?(Portrait|Landscape)\b/);
        if (matches && matches.length) {
            return matches[0];
        } else {
            return "";
        }
    }

    // Force size class to be one of the device classes
    // return true if we determine that the book is landscape
    public static setPageSizeClass(
        page: Element,
        bookCanRotate: boolean,
        showLandscape: boolean,
        useOriginalPageSize: boolean,
        originalPageClass: string
    ): boolean {
        let landscape = false;
        const sizeClass = this.getPageSizeClass(page);
        if (sizeClass) {
            landscape = bookCanRotate
                ? showLandscape
                : (sizeClass as any).endsWith("Landscape");

            let desiredClass = "";
            if (useOriginalPageSize) {
                desiredClass = landscape
                    ? originalPageClass.replace("Portrait", "Landscape")
                    : originalPageClass.replace("Landscape", "Portrait");
            } else {
                desiredClass = landscape
                    ? "Device16x9Landscape"
                    : "Device16x9Portrait";
            }
            if (sizeClass !== desiredClass) {
                page.classList.remove(sizeClass);
                page.classList.add(desiredClass);
            }
        }
        return landscape;
    }

    private goToFirstPage() {
        this.swiperInstance.slideTo(0);
    }

    private goToLastPage() {
        this.swiperInstance.slideTo(99999);
    }

    // urls of images and videos and audio need to be made
    // relative to the original book folder, not the page we are embedding them into.
    private fixRelativeUrls(page: Element) {
        const srcElts = page.ownerDocument!.evaluate(
            ".//*[@src]",
            page,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let j = 0; j < srcElts.snapshotLength; j++) {
            const item = srcElts.snapshotItem(j) as HTMLElement;
            if (!item) {
                continue;
            }
            const srcName = item.getAttribute("src");
            const srcPath = this.fullUrl(srcName);
            item.setAttribute("src", srcPath);
        }

        // now we need to fix elements with attributes like this:
        // style="background-image:url('AOR_10AW.png')"
        const bgSrcElts = page.ownerDocument!.evaluate(
            ".//*[@style]",
            page,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        const regexp = new RegExp(/background-image:url\(['"](.*)['"]\)/);

        for (let j = 0; j < bgSrcElts.snapshotLength; j++) {
            const item = bgSrcElts.snapshotItem(j) as HTMLElement;
            if (!item) {
                continue;
            }
            const style = item.getAttribute("style") || ""; // actually we know it has style, but make lint happy
            const match = regexp.exec(style);
            if (!match) {
                continue;
            }
            const newUrl = this.fullUrl(match[1]);
            const newStyle = style.replace(
                regexp,
                // if we weren't using lazy-load:
                //  "background-image:url('" + newUrl + "'"
                ""
            );
            item.setAttribute("style", newStyle);
            item.setAttribute("data-background", newUrl);
            item.classList.add("swiper-lazy");
        }
    }

    // Make a <style> element in the head of the document containing an adjusted version
    // of the "fonts.css" file shipped with the book, if any.
    // This file typically contains @font-face declarations, which don't work when embedded
    // in the <scoped> element we make for each page contents. So we need the rules to
    // be placed in the <head> of the main document. (We don't want to do this with most
    // rules because rules from a book, especially from a customStyles file, could mess up
    // bloom-player itself.)
    // Since the root file, typically bloomPlayer.htm, is typically not at the same location
    // as the book files, the simple URLs it contains don't work, since they assume fonts.css
    // is loaded as part of a file in the same location as the font files. So we modify
    // the URLs in the file to be relative to the book folder.
    // There are possible dangers here...if someone got something malicious into fonts.css
    // it could at least mess up our player...but only for that one book, and in any case,
    // fonts.css is generated by the harvester so it shouldn't be possible for anyone without
    // harvester credentials to post a bad version of it.
    // Enhance: currently we're just looking for the (typically ttf) font uploaded as part
    // of the book if embedding is permitted. Eventually, we might want to try first for
    // a corresponding woff font in a standard location. We may even be able to pay to
    // provide some fonts there for book previewing that are NOT embeddable.
    private makeFontStylesheet(href: string): void {
        axios.get(href).then(result => {
            let stylesheet = document.getElementById(
                "fontCssStyleSheet"
            ) as HTMLStyleElement;
            if (!stylesheet) {
                stylesheet = document.createElement("style");
                document.head.appendChild(stylesheet);
                stylesheet.setAttribute("id", "fontCssStyleSheet");
            }
            const prefix = href.substring(0, href.length - "/fonts.css".length);
            stylesheet.innerText = result.data.replace(
                // This is so complex because at one time we weren't adding the
                // quotes around the original url. So, now we handle no quotes,
                // single quotes, and double quotes. Note that we also have to
                // handle possible parentheses in the file name.
                /src:url\(['"]?(.*\.[^\)'"]*)['"]?\)/g,
                "src:url('" + prefix + "/$1')"
            );
        });
        // no catch clause...if there's no fonts.css, we should never get a 'then' and
        // don't need to do anything.
    }

    // Make a stylesheet that tells the player where to find Andika New Basic.
    // This can't be part of the <style scoped> where most style rules for the book
    // content go, because @font-face rules don't work there.
    private makeAndikaStylesheet(): void {
        let stylesheet = document.getElementById(
            "andikaCssStyleSheet"
        ) as HTMLStyleElement;
        if (!stylesheet) {
            stylesheet = document.createElement("style");
            document.head.appendChild(stylesheet);
            stylesheet.setAttribute("id", "andikaCssStyleSheet");
        }

        // Starting in Jul 2022, we provide Andika as a fallback to Andika New Basic.
        // (And we ship our hosts with Andika instead of ANB.)
        //
        // 1. The font might be found already installed (local).
        // 2. Failing that, if we're inside BloomReader, BloomPUB Viewer, or another host we control,
        //    we add the fake relative path `./host/fonts/*` so the host can intercept
        //    this request and serve the appropriate font file.
        //    (RAB doesn't use this stylesheet at all; rather, it modifies fonts.css.)
        // 3. If instead we're embedded in a web page like BloomLibrary.org, we need to download from the web.
        //
        // (Jun 2022) I'm not sure this is (still) true:
        // Note that currently that last option will only work when the page origin
        // is *bloomlibrary.org. This helps limit our exposure to large charges from
        // people using our font arbitrarily. This does include, however, books
        // displayed in an iframe using https://bloomlibrary.org/bloom-player/bloomplayer.htm
        //
        // Previously, this conditionally included some file:// urls for Android which were
        // conditionally included because they caused problems for Safari on iOS. That is why
        // they are here instead of bloom-player-content.less. In their current state,
        // I believe they could be moved there. But we may need conditional logic again...
        stylesheet.innerText = `
            @font-face {
                font-family: "Andika New Basic";
                font-weight: normal;
                font-style: normal;
                src:
                    local("Andika New Basic"),
                    local("Andika"),
                    url("./host/fonts/Andika New Basic"),
                    url("https://bloomlibrary.org/fonts/Andika%20New%20Basic/AndikaNewBasic-R.woff")
                ;
            }

            @font-face {
                font-family: "Andika New Basic";
                font-weight: bold;
                font-style: normal;
                src:
                    local("Andika New Basic Bold"),
                    local("Andika Bold"),
                    url("./host/fonts/Andika New Basic Bold"),
                    url("https://bloomlibrary.org/fonts/Andika%20New%20Basic/AndikaNewBasic-B.woff")
                ;
            }

            @font-face {
                font-family: "Andika New Basic";
                font-weight: normal;
                font-style: italic;
                src:
                    local("Andika New Basic Italic"),
                    local("Andika Italic"),
                    url("./host/fonts/Andika New Basic Italic"),
                    url("https://bloomlibrary.org/fonts/Andika%20New%20Basic/AndikaNewBasic-I.woff")
                ;
            }

            @font-face {
                font-family: "Andika New Basic";
                font-weight: bold;
                font-style: italic;
                src:
                    local("Andika New Basic Bold Italic"),
                    local("Andika Bold Italic"),
                    url("./host/fonts/Andika New Basic Bold Italic"),
                    url("https://bloomlibrary.org/fonts/Andika%20New%20Basic/AndikaNewBasic-BI.woff")
                ;
            }

            @font-face {
                font-family: "Andika";
                font-weight: normal;
                font-style: normal;
                src:
                    local("Andika"),
                    url("./host/fonts/Andika"),
                    url("https://bloomlibrary.org/fonts/Andika/Andika-Regular.woff")
                ;
            }

            @font-face {
                font-family: "Andika";
                font-weight: bold;
                font-style: normal;
                src:
                    local("Andika Bold"),
                    url("./host/fonts/Andika Bold"),
                    url("https://bloomlibrary.org/fonts/Andika/Andika-Bold.woff")
                ;
            }

            @font-face {
                font-family: "Andika";
                font-weight: normal;
                font-style: italic;
                src:
                    local("Andika Italic"),
                    url("./host/fonts/Andika Italic"),
                    url("https://bloomlibrary.org/fonts/Andika/Andika-Italic.woff")
                ;
            }

            @font-face {
                font-family: "Andika";
                font-weight: bold;
                font-style: italic;
                src:
                    local("Andika Bold Italic"),
                    url("./host/fonts/Andika Bold Italic"),
                    url("https://bloomlibrary.org/fonts/Andika/Andika-BoldItalic.woff")
                ;
            }

            .do-not-display {
                display:none !important;
            }
            `

            // (Jun 2022) these are not actually preventing <br> tags:
            .replace("\n", "")
            .replace("\r", ""); // newlines turn to <br> which is wrong in style element
    }

    // Assemble all the style rules from all the stylesheets the book contains or references.
    // When the async completes, the result will be set as our state.styles with setState().
    // Exception: a stylesheet called "fonts.css" will instead be loaded into the <head>
    // of the main document, since it contains @font-face declarations that don't work
    // in the <scoped> element.
    private async assembleStyleSheets(doc: HTMLHtmlElement): Promise<string> {
        this.makeAndikaStylesheet();
        const linkElts = doc.ownerDocument!.evaluate(
            ".//link[@href and @type='text/css']",
            doc,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        const promises: Array<AxiosPromise<any>> = [];
        for (let i = 0; i < linkElts.snapshotLength; i++) {
            const link = linkElts.snapshotItem(i) as HTMLElement;
            const href = link.getAttribute("href");
            const fullHref = this.fullUrl(href);
            if (fullHref.endsWith("/fonts.css")) {
                this.makeFontStylesheet(fullHref);
            } else {
                promises.push(axios.get(fullHref));
                if (fullHref.endsWith("/appearance.css")) {
                    this.bookInfo.hasAppearanceSystem = true;
                }
            }
        }
        const p = this.legacyQuestionHandler.getPromiseForAnyQuizCss();
        if (p) {
            promises.push(p);
        }

        try {
            const results = await axios.all(
                promises.map(promise =>
                    promise.catch(
                        // if one stylesheet doesn't exist or whatever, keep going
                        () => undefined
                    )
                )
            );

            let combinedStyle = "";

            // start with embedded styles (typically before links in a bloom doc...)
            const styleElts = doc.ownerDocument!.evaluate(
                ".//style[@type='text/css']",
                doc,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            for (let k = 0; k < styleElts.snapshotLength; k++) {
                const styleElt = styleElts.snapshotItem(k) as HTMLElement;
                combinedStyle += styleElt.innerText;
            }

            // then add the stylesheet contents we just retrieved
            results.forEach(result => {
                if (result && result.data) {
                    combinedStyle += result.data;

                    // It is somewhat awkward to do this in a method called assembleStyleSheets,
                    // but this is the best way to access the information currently.
                    // See further comments in getNationalLanguagesFromCssStyles.
                    //
                    // settingsCollectionStyles.css was replaced with defaultLangStyles.css.
                    // We have to check for both for older books.
                    if (
                        result.config!.url!.endsWith(
                            "/defaultLangStyles.css"
                        ) ||
                        result.config!.url!.endsWith(
                            "/settingsCollectionStyles.css"
                        )
                    ) {
                        this.bookInfo.setLanguage2And3(result.data);
                    }
                }
            });

            // A ":root" selector doesn't work in this scoped css context.
            // Change all ":root" references to ".bloomPlayer-page", which is the level just above .bloom-page.
            // We're using this instead of .bloom-page directly so that a selector like `:root .bloom-page` would still work.
            combinedStyle = combinedStyle.replace(
                /:root/g,
                ".bloomPlayer-page"
            );
            return combinedStyle;
        } catch (err) {
            this.HandleLoadingError(err);
            return "";
        }
    }

    private fullUrl(url: string | null): string {
        // Enhance: possibly we should only do this if we somehow determine it is a relative URL?
        // But the things we apply it to always are, in bloom books.
        const hasBlobUrl = url?.startsWith("blob:");
        return hasBlobUrl && url ? url : this.urlPrefix + "/" + url;
    }

    private swiperInstance: SwiperInstance | null;
    private rootDiv: HTMLElement | null;

    public getRootDiv(): HTMLElement | null {
        return this.rootDiv;
    }

    public slideNext(): void {
        if (this.swiperInstance) {
            this.swiperInstance.slideNext();
        }
    }

    public slidePrevious(): void {
        if (this.swiperInstance) {
            this.swiperInstance.slidePrev();
        }
    }

    private getPlayerOptionsForPage(
        bloomPage: HTMLElement
    ): IPlayerPageOptions | undefined {
        if (!bloomPage) {
            return undefined;
        }
        let optionJson = bloomPage.getAttribute("data-player-options");
        if (!optionJson) {
            return undefined;
        }
        try {
            // We tried various options here. Single quote works and Bloom doesn't replace it with
            // anything else. Backticks (as in comical) would work too, but single quotes are less
            // "obscure". Using nothing around the "hideNavigation" doesn't parse. Using single quotes
            // outside and double quotes inside doesn't work because Bloom escapes the double quotes.
            optionJson = optionJson.replace(/'/g, '"');
            return JSON.parse(optionJson);
        } catch (e) {
            console.log(
                "getPlayerOptionsForPage failed to parse json: " +
                    optionJson +
                    " with error " +
                    e.message
            );
            return;
        }
    }

    public render() {
        const showNavigationButtonsEvenOnTouchDevices =
            // we have to have *some* way of changing the page
            this.activityManager.getActivityAbsorbsDragging();
        if (this.state.isLoading) {
            return (
                <CircularProgress
                    className="loadingSpinner"
                    color="secondary"
                />
            );
        }
        if (this.state.loadFailed) {
            return (
                <>
                    <LoadFailedIcon
                        className="loadFailedIcon"
                        color="secondary"
                    />
                    <div
                        className="loadErrorMessage"
                        dangerouslySetInnerHTML={{
                            __html: this.state.loadErrorHtml
                        }}
                    />
                </>
            );
        }
        setIncludeImageDescriptions(
            this.props.shouldReadImageDescriptions && this.hasImageDescriptions
        );
        const swiperParams: any = {
            // This is how we'd expect to make the next/prev buttons show up.
            // However, swiper puts them inside the swiper-container div, which has position:relative
            // and overflow:hidden. This hides the buttons when we want them to be outside the book
            // (e.g., bloom library). So instead we make our own buttons.
            // navigation: {
            //     nextEl: ".swiper-button-next",
            //     prevEl: ".swiper-button-prev"
            // },
            getSwiper: s => {
                this.swiperInstance = s;
                if (this.metaDataObject.isRtl && this.swiperInstance) {
                    // These kluges cause swiper to display the pages in reverse order.
                    // We are digging deep into the current implementation of Swiper; this might
                    // not work with any other version.
                    // The latest Swiper apparently has a method to do this. We should use it,
                    // even if this still works, if we upgrade. But when we upgrade, we really want
                    // to switch to the React support that is now provided by the core Swiper
                    // component. And that is currently in transition as Swiper converts to a
                    // web component. It doesn't feel like a good time to attempt the conversion.
                    this.swiperInstance.el?.setAttribute("dir", "rtl");
                    // These two steps for some reason don't seem to be needed when loading an RTL
                    // book in storybook, but in Bloom Editor preview, without them, we get
                    // blank content for all but the first page.
                    this.swiperInstance.rtl = true;
                    this.swiperInstance.rtlTranslate = true;
                }
            },
            simulateTouch: true, //Swiper will accept mouse events like touch events (click and drag to change slides)
            touchStartPreventDefault: false, // If true, would prevent the default, which would cause niceScroll not to receive mousedown events.

            on: {
                slideChange: () => {
                    if (
                        this.state.inPauseForced &&
                        this.props.setForcedPausedCallback
                    ) {
                        this.props.setForcedPausedCallback(false);
                    }
                    this.setState({ inPauseForced: false });

                    if (!this.startingUpSwiper) {
                        // console.log(
                        //     "changing page to " +
                        //         this.swiperInstance.activeIndex +
                        //         " in slideChange; state active index is " +
                        //         this.state.currentSwiperIndex
                        // );
                        this.showingPage(this.swiperInstance.activeIndex);
                    }
                    this.msToContinueFF60RepairChecks = 30000;
                },
                slideChangeTransitionStart: () => {
                    this.msToContinueFF60RepairChecks = 0; // disable

                    if (!this.startingUpSwiper) {
                        // console.log(
                        //     "setting index to " +
                        //         this.swiperInstance.activeIndex +
                        //         " in slideChangeTransitionStart; state active index is " +
                        //         this.state.currentSwiperIndex
                        // );
                        this.setIndex(this.swiperInstance.activeIndex);
                    }
                },
                // Not sure we need all of these. The idea is that if slider is
                // messing with offsets itself, we don't want to try to adjust things.
                // During e.g. animation, it's normal that the current page isn't aligned
                // with the frame.
                // It appears that the last setTranslate call happens before at least one
                // of the events we're using to turn checking on.
                setTranslate: () => (this.msToContinueFF60RepairChecks = 0), // disable
                sliderMove: () => (this.msToContinueFF60RepairChecks = 0), // disable
                // This (30s) is a pretty generous allowance. Our theory is that the problem occurs
                // when the activity finishes loading, typically sometime after the page before
                // it becomes the 'current' page and the activity itself is therefore the 'next'
                // page. Observed cases take about 2s for the problem to appear on a fast computer
                // with a good internet. 30s allows for it to be a LOT slower on a phone with a poor
                // connection.. We want SOME limit so
                // we don't keep using power for hours if the device is left on this page.
                slideChangeTransitionEnd: () =>
                    (this.msToContinueFF60RepairChecks = 30000)
            },
            keyboard: {
                enabled: true,
                onlyInViewport: false
            },
            // Disable preloading of all images
            preloadImages: false,

            // Enable lazy loading, but load anything needed for the next couple of slides.
            // (I'm trying to avoid a problem where, in landscape mode of motion books,
            // we see a flash of the page without the full-screen picture overlaid.
            // I don't _think_ I saw this before implementing laziness. So far, I haven't
            // found settings that eliminate it completely, even commenting out preloadImages:false,
            // which defeats much of the purpose.)
            lazy: {
                loadPrevNext: true,
                loadOnTransitionStart: true,
                loadPrevNextAmount: 2
            },
            // This seems make it unnecessary to call Swiper.update at the end of componentDidUpdate.
            shouldSwiperUpdate: true
        };
        if (this.startingUpSwiper) {
            // When we first render swiper, we need to force it to the right page. But not later,
            // otherwise, it prevents us ever changing page! (This badly named param is the index
            // of the slide to show.) (There's possibly some drastic redesign that would let the
            // current page be a fully controlled paramter. But maybe not...react-id-slider is a
            // thin layer over something that isn't fully React.)
            swiperParams.activeSlideKey = this.props.startPage?.toString();
        }

        let bloomPlayerClass = "bloomPlayer";
        if (this.currentPageHidesNavigationButtons) {
            bloomPlayerClass +=
                " hideNextPrevButtons extraScalingForChrome85Bug";
        } else if (this.props.outsideButtonPageClass) {
            // there's room for buttons outside the page; show them.
            bloomPlayerClass += " " + this.props.outsideButtonPageClass;
            // Bloom Reader on Android can have states where the page display
            // area is smaller than the screen area, and the buttons could
            // display outside the page if needed.
            // See https://issues.bloomlibrary.org/youtrack/issue/BL-8680.
            // See also https://issues.bloomlibrary.org/youtrack/issue/BL-8806.
            if (showNavigationButtonsEvenOnTouchDevices) {
                bloomPlayerClass += " showNavigationButtonsEvenOnTouchDevices";
            }
        } else if (showNavigationButtonsEvenOnTouchDevices) {
            bloomPlayerClass += " showNavigationButtonsEvenOnTouchDevices";
        }

        // multiple classes help make rules more specific than those in the book's stylesheet
        // (which benefit from an extra attribute item like __scoped_N)
        // It would be nice to use an ID but we don't want to assume there is
        // only one of these components on a page.
        return (
            <div
                aria-label="Player Content"
                className={
                    bloomPlayerClass +
                    (this.props.extraClassNames
                        ? " " + this.props.extraClassNames
                        : "")
                }
                ref={bloomplayer => (this.rootDiv = bloomplayer)}
            >
                <Swiper
                    // key is necessary to guarantee we get a new swiper when this.shouldAutoPlay changes.
                    // Otherwise, effect does not change.
                    key={this.shouldAutoPlay() ? "fade" : "slide"}
                    {...swiperParams}
                    effect={this.shouldAutoPlay() ? "fade" : "slide"}
                    // For now, we will go with the default transition time,
                    // but I'm leaving this here because if we decide to change it, this is how.
                    // speed={this.shouldAutoPlay() ? 1500 : 300} // 300 is the default
                >
                    {this.state.pages.map((slide, index) => {
                        const pageIsCloseToCurrentOne =
                            Math.abs(index - this.state.currentSwiperIndex) < 2;
                        const useActualContents =
                            pageIsCloseToCurrentOne ||
                            this.indicesOfPagesWhereWeShouldPreserveDOMState[
                                index
                            ];

                        return (
                            <div
                                key={index}
                                className={"page-preview-slide"}
                                onClick={e => {
                                    if (
                                        !this.state.ignorePhonyClick && // if we're dragging, that isn't a click we want to propagate
                                        this.props.onContentClick &&
                                        !this.activityManager.getActivityAbsorbsClicking() &&
                                        // clicks in video containers are probably aimed at the video controls.
                                        // I tried adding another click handler to the video container with stopPropagation,
                                        // but for some reason it didn't work.
                                        !(e.target as HTMLElement).closest(
                                            ".bloom-videoContainer"
                                        )
                                    ) {
                                        this.props.onContentClick(e);
                                    }
                                    this.setState({
                                        ignorePhonyClick: false
                                    });
                                }}
                            >
                                {/* This is a huge performance enhancement on large books (from several minutes to a few seconds):
                    Only load up the one that is about to be current page and the ones on either side of it with
                    actual html contents, let every other page be an empty string placeholder. Ref BL-7652 */}
                                {useActualContents ? (
                                    <>
                                        {/* The idea here is to scope our styles (using a polyfill)
                            so that book styles cannot inadvertently change the swiper or other
                            elements outside the pages themselves. However, we discovered 2/2021
                            that this does not work, at least in some circumstances.
                            E.g. you can style the swiper next button using an !important rule
                            in the collection custom css.
                            The problem occurs because state.styleRules gets modified on a subsequent render.
                            I.e. if we could get rid of the extra render, this would work until something
                            else introduces another render.
                            I (Andrew) attempted to implement this using a shadow dom and got fairly
                            far using the react-shadow package, but various styles inside the page
                            were having issues, and lazy loading of images was not working. */}
                                        <style scoped={true}>
                                            {this.state.styleRules}
                                        </style>
                                        <div
                                            {...this.state
                                                .importedBodyAttributes}
                                            // The above will put in the class attribute that was on the body
                                            // now we want to overwrite that with those same classes, but add
                                            // this bloomPlayer-page one.
                                            className={`bloomPlayer-page ${
                                                this.bookInfo
                                                    .hasAppearanceSystem
                                                    ? "appearance-system"
                                                    : ""
                                            } ${this.state
                                                .importedBodyAttributes[
                                                "class"
                                            ] ?? ""}`}
                                            // Note: the contents of `slide` are what was in the .htm originally.
                                            // So you would expect that this would replace any changes made to the dom by the activity or other code.
                                            // You would expect that we would lose the answers a user made in an activity.
                                            // However it appears that React doesn't notice those changes and thus does nothing when we try to set
                                            // the HTML here to what it was originally; instead changes to the DOM are preserved.
                                            dangerouslySetInnerHTML={{
                                                __html: slide
                                            }}
                                            ref={div =>
                                                this.fixInternalHyperlinks(div)
                                            }
                                        />
                                    </>
                                ) : (
                                    // All other pages are just empty strings
                                    ""
                                    // Doing this instead can be useful in debugging.
                                    // <div
                                    //     style={{
                                    //         color: "yellow",
                                    //         fontSize: "larger"
                                    //     }}
                                    // >
                                    //     {"page " + index}
                                    // </div>
                                )}
                            </div>
                        );
                    })}
                </Swiper>
                <div
                    className={
                        "swiper-button-prev " +
                        (this.metaDataObject.isRtl
                            ? "swiper-button-right"
                            : "swiper-button-left") +
                        (this.props.hideSwiperButtons ||
                        this.state.currentSwiperIndex === 0
                            ? " swiper-button-disabled"
                            : "")
                    }
                    onClick={() => this.slidePrevious()}
                    onTouchStart={e => {
                        this.setState({ ignorePhonyClick: true });
                        // not needed, touch still causes a click, this can cause double page change
                        //this.slidePrevious();
                    }}
                >
                    {/* The ripple is an animation on the button on click and
                    focus, but it isn't placed correctly on our buttons for
                    some reason */}
                    <IconButton className={"nav-button"} disableRipple={true}>
                        {this.metaDataObject.isRtl ? (
                            <ArrowForward
                                titleAccess={LocalizationManager.getTranslation(
                                    "Button.Prev",
                                    this.props.preferredUiLanguages,
                                    "Previous Page"
                                )}
                            />
                        ) : (
                            <ArrowBack
                                titleAccess={LocalizationManager.getTranslation(
                                    "Button.Prev",
                                    this.props.preferredUiLanguages,
                                    "Previous Page"
                                )}
                            />
                        )}
                    </IconButton>
                </div>
                <div
                    className={
                        "swiper-button-next " +
                        (this.metaDataObject.isRtl
                            ? "swiper-button-left"
                            : "swiper-button-right") +
                        (this.props.hideSwiperButtons ||
                        this.state.currentSwiperIndex >=
                            this.state.pages.length - 1
                            ? " swiper-button-disabled"
                            : "")
                    }
                    onClick={() => this.slideNext()}
                    onTouchStart={e => {
                        this.setState({ ignorePhonyClick: true });
                        // not needed, touch still causes a click, this can cause double page change
                        //this.slideNext();
                    }}
                >
                    <IconButton className={"nav-button"} disableRipple={true}>
                        {this.metaDataObject.isRtl ? (
                            <ArrowBack
                                titleAccess={LocalizationManager.getTranslation(
                                    "Button.Next",
                                    this.props.preferredUiLanguages,
                                    "Next Page"
                                )}
                            />
                        ) : (
                            <ArrowForward
                                titleAccess={LocalizationManager.getTranslation(
                                    "Button.Next",
                                    this.props.preferredUiLanguages,
                                    "Next Page"
                                )}
                            />
                        )}
                    </IconButton>
                </div>
            </div>
        );
    }

    // A bloom book may have hyperlinks that are simply of the form #pageId.
    // When such a link is clicked, we don't want the whole browser to navigate there;
    // we want to move to that page.
    // Other internal links won't work and are disabled; external ones are forced to
    // open a new tab as the results of trying to display a web page in the bloom-player
    // iframe or webview can be confusing.
    private fixInternalHyperlinks(div: HTMLDivElement | null): void {
        if (!div) {
            return;
        }
        const anchors = Array.from(div.getElementsByTagName("a") ?? []);
        anchors.forEach(a => {
            const href = a.getAttribute("href"); // not a.href, which has the full page address prepended.
            if (href?.startsWith("#")) {
                const pageId = href.substring(1);
                const pageNum = this.state.pageIdToIndexMap[pageId];
                if (pageNum !== undefined) {
                    a.href = ""; // may not be needed, on its own was unsuccessful in stopping attempted default navigation
                    a.onclick = ev => {
                        ev.preventDefault(); // don't try to follow the link, other than by the slideTo below
                        ev.stopPropagation(); // don't allow parent listeners, particularly the one that toggles the nav bar
                        this.swiperInstance.slideTo(pageNum);
                    };
                } else {
                    // no other kind of internal link makes sense, so let them be ignored.
                    a.onclick = ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                    };
                }
            } else {
                // an external link. It will likely confuse things to follow it inside whatever iframe or webview
                // bloom player may be running in, so encourage opening a new tab or similar action.
                a.setAttribute("target", "blank");
            }
        });
    }

    // What we need to do when the page narration is completed (if autoadvance, go to next page).
    public handlePageNarrationComplete = (page: HTMLElement | undefined) => {
        // When we run this in Bloom, these variables are all present and accounted for and accurate.
        // When it's run in Storybook, not so much.
        if (!page) {
            return;
        }
        setCurrentPlaybackMode(PlaybackMode.MediaFinished);
        // TODO: at this point, signal BloomPlayerControls to switch the pause button to show play.

        if (this.shouldAutoPlay()) {
            const autoplayCount = this.props.autoplayCount ?? 0;
            const startPage = this.props.startPage ?? 0;
            const lastPage = this.swiperInstance.slides.length - 1;
            let lastPageToAutoplay = this.props.autoplayCount
                ? Math.min(startPage + autoplayCount - 1, lastPage)
                : lastPage;

            if (this.swiperInstance.activeIndex >= lastPageToAutoplay) {
                // Stop any music that is still playing. The book is done. (Also helps with accuracy of reportSoundsLogged).
                this.music.pause();
                if (this.props.shouldReportSoundLog) {
                    reportSoundsLogged();
                }
                clearSoundLog();
                reportPlaybackComplete({});
            } else {
                this.swiperInstance.slideNext();
            }
        }
    };

    private shouldAutoPlay(): boolean {
        var autoPlay = this.bookInfo.autoAdvance && this.props.landscape; // default or autoPlay==="motion"
        if (this.props.autoplay === "yes") {
            autoPlay = true;
        } else if (this.props.autoplay === "no") {
            autoPlay = false;
        }
        return autoPlay;
    }

    // Called from slideChangeTransitionStart
    // - makes an early change to state.currentSwiperIndex, which triggers some
    // class changes to animate the page sizing/shading in 3-page mode
    // - may need to force the page layout class to match the current button
    // setting, before we start to slide it into view
    // - if we're animating motion or showing video, need to get the page into the start state
    // before we slide it in
    private setIndex(index: number) {
        if (this.state.isLoading || this.startingUpSwiper) {
            //console.log("aborting setIndex because still starting up");
            return;
        }
        this.setState({ currentSwiperIndex: index });
        const bloomPage = this.getPageAtSwiperIndex(index);
        if (bloomPage) {
            // We need this in case the page size class has changed since we built
            // the page list, e.g., because of useOriginalPageSize changing, or possibly rotation.
            this.setPageSizeClass(bloomPage);
            this.animation.HandlePageBeforeVisible(bloomPage);
            // Don't need to be playing a video that's off-screen,
            // and definitely don't want to be reporting analytics on
            // its continued playing.
            this.video.hidingPage();
            this.video.HandlePageBeforeVisible(bloomPage);
            hidingNarrationPage();
            this.music.hidingPage();
            if (
                currentPlaybackMode === PlaybackMode.AudioPaused ||
                currentPlaybackMode === PlaybackMode.VideoPaused
            ) {
                setCurrentPlaybackMode(PlaybackMode.NewPageMediaPaused);
            } else {
                setCurrentPlaybackMode(PlaybackMode.NewPage);
            }
        }
    }

    private getPageAtSwiperIndex(index: number): HTMLElement | null {
        if (this.swiperInstance == null) {
            return null;
        }
        const swiperPage = this.swiperInstance.slides[index] as HTMLElement;
        if (!swiperPage) {
            return null; // unexpected
        }
        const bloomPage = swiperPage.getElementsByClassName(
            "bloom-page"
        )[0] as HTMLElement;
        return bloomPage;
    }

    public static getCurrentPage(): HTMLElement {
        return BloomPlayerCore.currentPage!;
    }

    private isXmatterPage(): boolean {
        const page = BloomPlayerCore.currentPage;
        if (!page) {
            return true; // shouldn't happen, but at least it won't be counted in analytics
        }
        const classAttr = page.getAttribute("class");
        if (!classAttr || classAttr.indexOf("bloom-page") < 0) {
            return true; // as above, shouldn't happen, but...
        }
        // This test shouldn't be necessary, all xmatter pages are supposed to have data-xmatter-page,
        // but some (e.g., the final 'End' page in device-xmatter) currently don't. Even if we fix that,
        // it won't necessarily be fixed in existing bloomds.
        if (
            classAttr.indexOf("bloom-backMatter") >= 0 ||
            classAttr.indexOf("bloom-frontMatter") >= 0
        ) {
            return true;
        }
        return page.hasAttribute("data-xmatter-page");
    }

    // Called from slideChange, starts narration, etc.
    private showingPage(index: number): void {
        if (this.state.isLoading || this.startingUpSwiper) {
            //console.log("aborting showingPage because still loading");
            return;
        }
        if (this.props.pageChanged) {
            this.props.pageChanged(index);
        }
        const bloomPage = this.getPageAtSwiperIndex(index);
        if (!bloomPage) {
            // It MIGHT be a blank initial or final page placeholder, but more likely, we did a long
            // scroll using the slider, so we're switching to a page that is, for the moment,
            // empty due to laziness. A later render will fill it in. We want to try again then. Not sure how
            // else to make sure that happens.
            window.setTimeout(() => this.showingPage(index), 50);
            return; // nothing more we can do until the page we want really exists.
        }
        // We will pass options on how to deal with the current page to BP via the
        // 'data-player-options' json.
        const options = this.getPlayerOptionsForPage(bloomPage);
        this.currentPageHidesNavigationButtons =
            options && options.hideNavigation ? true : false;
        if (this.props.hidingNavigationButtonsCallback) {
            this.props.hidingNavigationButtonsCallback(
                this.currentPageHidesNavigationButtons
            );
        }
        // Values this sets are used in the render of the new page, so it must NOT
        // be postponed like the other actions below.
        if (this.activityManager.showingPage(index, bloomPage)) {
            this.indicesOfPagesWhereWeShouldPreserveDOMState[index] = true;
        }

        // While working on performance, we found that (at least some of) the following was slow.
        // (In a large book, still somewhat inexplicably, the stuff checking for audio was slow).
        // Even though the new page was already computed, we found that this blocked the ui from
        // scrolling it into view. So now we allow that to finish, then do this stuff.
        //console.log(`ShowingPage(${index})`);
        window.setTimeout(() => {
            BloomPlayerCore.currentPage = bloomPage;
            BloomPlayerCore.currentPageIndex = index;
            BloomPlayerCore.currentPageHasVideo = Video.pageHasVideo(bloomPage);

            // This is probably redundant, since we update all the page sizes on rotate, and again in setIndex.
            // It's not expensive so leaving it in for robustness.
            this.setPageSizeClass(bloomPage);

            if (!this.props.paused) {
                this.resetForNewPageAndPlay(bloomPage);
            }

            if (!this.isXmatterPage()) {
                this.bookInteraction.pageShown(index);
                if (index === this.indexOflastNumberedPage) {
                    this.bookInteraction.lastNumberedPageWasRead = true;
                }
            }

            if (this.props.reportPageProperties) {
                // Informs containing react controls (in the same frame)
                this.props.reportPageProperties({
                    hasAudio: pageHasAudio(bloomPage),
                    hasMusic: this.music.pageHasMusic(bloomPage),
                    hasVideo: BloomPlayerCore.currentPageHasVideo
                });
            }

            this.bookInteraction.reportedAudioOnCurrentPage = false;
            this.bookInteraction.reportedVideoOnCurrentPage = false;
            this.sendUpdateOfBookProgressReportToExternalContext();

            // these were hard to get right. If you change them, make sure to test both mouse and touch mode (simulated in Chrome)
            this.swiperInstance.params.noSwiping = this.activityManager.getActivityAbsorbsDragging();
            this.swiperInstance.params.touchRatio = this.activityManager.getActivityAbsorbsDragging()
                ? 0
                : 1;
            // didn't seem to help: this.swiperInstance.params.allowTouchMove = false;
            if (this.activityManager.getActivityAbsorbsTyping()) {
                this.swiperInstance.keyboard.disable();
            } else {
                this.swiperInstance.keyboard.enable();
            }

            BloomPlayerCore.addScrollbarsToPage(bloomPage);
            const soundItems = Array.from(
                bloomPage.querySelectorAll("[data-sound]")
            );
            soundItems.forEach((elt: HTMLElement) => {
                elt.addEventListener("click", playSoundOf);
            });
        }, 0); // do this on the next cycle, so we don't block scrolling and display of the next page
    }

    private static addScrollbarsToPage(bloomPage: Element): void {
        // Expected behavior for cover: "on the cover, which is has a very dynamic layout, we just don't do scrollbars"
        if (bloomPage.classList.contains("cover")) {
            return;
        }
        // ENHANCE: If you drag the scrollbar mostly horizontal instead of mostly vertical,
        // both the page swiping and the scrollbar will be operating, which is somewhat confusing
        // and not perfectly ideal, although it doesn't really break anything.
        // It'd be nice so that if you're dragging the scrollbar in any way, swiping is disabled.

        // on a browser so obsolete that it doesn't have IntersectionObserver (e.g., IE or Safari before 12.2),
        // we just won't get scrolling.
        if ("IntersectionObserver" in window) {
            // Attach overlaid scrollbar to all editables except textOverPictures (e.g. comics)
            // Expected behavior for comic bubbles:  "we want overflow to show, but not generate scroll bars"
            let scrollBlocks: HTMLElement[] = [];
            let countOfObserversExpectedToReport = 0;
            let countOfObserversThatHaveReported = 0;
            $(bloomPage)
                .find(kSelectorForPotentialNiceScrollElements)
                .each((index, elt) => {
                    // Process the blocks that are possibly overflowing.
                    // Blocks that are overflowing will be configured to use niceScroll
                    // so the user can scroll and see everything. That is costly, because
                    // niceScroll leaks event listeners every time it is called. So we don't
                    // want to use it any more than we need to. Also, niceScroll
                    // somehow fails to work when our vertical alignment classes are applied;
                    // probably something to do with the bloom-editables being display:flex
                    // to achieve vertical positioning. We can safely remove those classes
                    // if the block is overflowing, because there's no excess white space
                    // to distribute.
                    // Note: there are complications Bloom desktop handles in determining
                    // accurately whether a block is overflowing. We don't need those here.
                    // If it is close enough to overflow to get a scroll bar, it's close
                    // enough not to care whether extra white space is at the top, bottom,
                    // or split (hence we can safely remove classes used for that).
                    // And we'll risk sometimes adding niceScroll when we could (just)
                    // have done without it.
                    const firstChild = elt.firstElementChild;
                    const lastChild = elt.lastElementChild;
                    if (!lastChild) {
                        // no children, can't be overflowing
                        return;
                    }
                    // nicescroll doesn't properly scale the padding at the top and left of the
                    // scrollable area of the languageGroup divs when the page is scaled.  This
                    // code sets offset values to correct for this.  The scale is determined by
                    // looking for a style element with an id of "scale-style-sheet" and extracting
                    // the scale from the transform property.  See BL-13796.
                    let scale = 1;
                    const scaleStyle = document.querySelector(
                        "style#scale-style-sheet"
                    );
                    if (scaleStyle) {
                        const match = scaleStyle.innerHTML.match(
                            /transform:[a-z0-9, ()]* scale\((\d+(\.\d+)?)\)/
                        );
                        if (match) {
                            scale = parseFloat(match[1]);
                        }
                    }
                    let {
                        topAdjust,
                        leftAdjust
                    } = BloomPlayerCore.ComputeNiceScrollOffsets(scale, elt);
                    // We don't really want continuous observation, but this is an elegant
                    // way to find out whether each child is entirely contained within its
                    // parent. Unlike computations involving coordinates, we don't have to
                    // worry about whether borders, margins, and padding are included in
                    // various measurements. We do need to check the first as well as the
                    // last child, because if text is aligned bottom, any overflow will be
                    // at the top.
                    const observer = new IntersectionObserver(
                        (entries, ob) => {
                            // called more-or-less immediately for each child, but after the
                            // loop creates them all.
                            entries.forEach(entry => {
                                countOfObserversThatHaveReported++;
                                ob.unobserve(entry.target); // don't want to keep getting them, or leak observers
                                // console.log("bounding: ");
                                // console.log(entry.boundingClientRect);
                                // console.log(entry.intersectionRect);
                                // console.log(entry.rootBounds);
                                // console.log(
                                //     "ratio: " + entry.intersectionRatio
                                // );
                                var isBubble = !!entry.target.closest(
                                    ".bloom-textOverPicture"
                                );
                                // In bloom desktop preview, we set width to 200% and then scale down by 50%.
                                // This can lead to intersection ratios very slightly less than 1, probably due
                                // to pixel rounding of some sort, when in fact the content fits comfortably.
                                // For example, in one case we got a boundingClientRect 72.433 high
                                // and an intersectionRect 72.416, for a ratio of 0.9998.
                                // If a block is 1000 pixels high and really overflowing by 1 pixel, the ratio
                                // will be 0.999. I think it's safe to take anything closer to 1 than that as
                                // 'not overflowing'.
                                let overflowing =
                                    entry.intersectionRatio < 0.999;

                                if (overflowing && isBubble) {
                                    // We want to be less aggressive about putting scroll bars on bubbles.
                                    // Most of the time, a bubble is very carefully sized to just fit the
                                    // text. But the intersection observer wants it to fit a certain amount
                                    // of white space as well. We want a scroll bar if it's overflowing
                                    // really badly for some reason, but that's much more the exception
                                    // than the rule, so better a little clipping when the bubble is badly
                                    // sized than a scroll bar that isn't needed in one that is just right.
                                    // Example: a bubble which appears to fit perfectly, 3 lines high:
                                    // its clientHeight is 72; containing bloom-editable's is 59;
                                    // lineHeight is 24px. IntersectionRatio computes to 59/72,
                                    // which makes the 'overflow' 13. A ratio of 0.5 as we originally
                                    // proposed would give us a scroll bar we don't want.
                                    let maxBubbleOverflowLineFraction = 0.6;
                                    if (
                                        entry.target !=
                                            entry.target.parentElement
                                                ?.firstElementChild ||
                                        entry.target !=
                                            entry.target.parentElement!
                                                .lastElementChild
                                    ) {
                                        // Bubbles are center-aligned vertically. If this is not the only
                                        // child,the first and last will overflow above and below by about the
                                        // same amount. So we're only really looking at half the overflow on this para,
                                        // and should reduce the threshold.
                                        maxBubbleOverflowLineFraction /= 2;
                                    }
                                    const overflow =
                                        (1 - entry.intersectionRatio) *
                                        entry.target.clientHeight;
                                    const lineHeightPx = window.getComputedStyle(
                                        entry.target
                                    ).lineHeight;
                                    const lineHeight = parseFloat(
                                        // remove the trailing "px"
                                        lineHeightPx.substring(
                                            0,
                                            lineHeightPx.length - 2
                                        )
                                    );
                                    overflowing =
                                        overflow >
                                        lineHeight *
                                            maxBubbleOverflowLineFraction;
                                }
                                if (
                                    overflowing &&
                                    scrollBlocks.indexOf(
                                        entry.target.parentElement!
                                    ) < 0
                                ) {
                                    scrollBlocks.push(
                                        entry.target.parentElement!
                                    );
                                    // remove classes incompatible with niceScroll
                                    const group = entry.target.parentElement!
                                        .parentElement!;
                                    group.classList.remove(
                                        "bloom-vertical-align-center"
                                    );
                                    group.classList.remove(
                                        "bloom-vertical-align-bottom"
                                    );
                                    if (isBubble) {
                                        // This is a way of forcing it not to be display-flex, which doesn't
                                        // work with the nice-scroll-bar library we're using.
                                        // That library messes with the element style, so it seemed safer
                                        // not to do that myself.
                                        entry.target.parentElement!.classList.add(
                                            "scrolling-bubble"
                                        );
                                    }
                                }
                                if (
                                    countOfObserversThatHaveReported ==
                                    countOfObserversExpectedToReport
                                ) {
                                    // configure nicescroll...ideally only once for all of them
                                    $(scrollBlocks).niceScroll({
                                        autohidemode: false,
                                        railoffset: {
                                            top: -topAdjust,
                                            left: -leftAdjust
                                        },
                                        cursorwidth: "12px",
                                        cursorcolor: "#000000",
                                        cursoropacitymax: 0.1,
                                        cursorborderradius: "12px" // Make the corner more rounded than the 5px default.
                                    });
                                    this.setupSpecialMouseTrackingForNiceScroll(
                                        bloomPage
                                    );
                                    scrollBlocks = []; // Just in case it's possible to get callbacks before we created them all.
                                }
                            });
                        },
                        { root: elt }
                    );
                    countOfObserversExpectedToReport++;
                    observer.observe(firstChild!);
                    if (firstChild != lastChild) {
                        countOfObserversExpectedToReport++;
                        observer.observe(lastChild);
                    }
                });
        }
    }

    // nicescroll doesn't properly scale the padding at the top and left of the
    // scrollable area of the languageGroup divs when the page is scaled.  This
    // method computes offset values to correct for this.  See BL-13796.
    private static ComputeNiceScrollOffsets(scale: number, elt: HTMLElement) {
        let topAdjust = 0;
        let leftAdjust = 0;
        if (scale !== 1) {
            const compStyles = window.getComputedStyle(elt.parentElement!);
            const topPadding =
                compStyles.getPropertyValue("padding-top") ?? "0";
            const leftPadding =
                compStyles.getPropertyValue("padding-left") ?? "0";
            topAdjust = parseFloat(topPadding) * (scale - 1);
            leftAdjust = parseFloat(leftPadding) * (scale - 1);
        }
        return { topAdjust, leftAdjust };
    }

    static setupSpecialMouseTrackingForNiceScroll(bloomPage: Element) {
        bloomPage.removeEventListener("pointerdown", this.listenForPointerDown); // only want one!
        bloomPage.addEventListener("pointerdown", this.listenForPointerDown);
    }
    // If the mouse down is in the thumb of a NiceScroll, we don't want to get a click
    // event later even if the mouse up is outside that element.
    static listenForPointerDown(ev: PointerEvent) {
        if (
            ev.target instanceof HTMLDivElement &&
            (ev.target as HTMLDivElement).classList.contains(
                "nicescroll-cursors"
            )
        ) {
            (ev.target as HTMLDivElement).setPointerCapture(ev.pointerId);
        }
    }

    // called by narration.ts
    public storeAudioAnalytics(duration: number): void {
        if (duration < 0.001 || Number.isNaN(duration)) {
            return;
        }

        this.bookInteraction.totalAudioDuration += duration;

        if (this.isXmatterPage()) {
            // Our policy is only to count non-xmatter audio pages. BL-7334.
            return;
        }

        if (!this.bookInteraction.reportedAudioOnCurrentPage) {
            this.bookInteraction.reportedAudioOnCurrentPage = true;
            this.bookInteraction.audioPageShown(
                BloomPlayerCore.currentPageIndex
            );
        }
        this.sendUpdateOfBookProgressReportToExternalContext();
    }

    public static storeVideoAnalytics(duration: number) {
        // We get some spurious very small durations, including sometimes a zero on a page that
        // doesn't have any video.
        if (duration < 0.001) {
            return;
        }
        const player = BloomPlayerCore.currentPagePlayer;
        player.bookInteraction.totalVideoDuration += duration;
        if (
            !player.bookInteraction.reportedVideoOnCurrentPage &&
            !player.isXmatterPage()
        ) {
            player.bookInteraction.reportedVideoOnCurrentPage = true;
            player.bookInteraction.videoPageShown(
                BloomPlayerCore.currentPageIndex
            );
        }
        player.sendUpdateOfBookProgressReportToExternalContext();
    }

    // This should only be called when NOT paused, because it will begin to play audio and highlighting
    // and animation from the beginning of the page.
    private resetForNewPageAndPlay(bloomPage: HTMLElement): void {
        if (this.props.paused) {
            return; // shouldn't call when paused
        }
        this.animation.PlayAnimation(); // get rid of classes that made it pause
        setCurrentNarrationPage(bloomPage);
        // State must be set before calling HandlePageVisible() and related methods.
        if (BloomPlayerCore.currentPageHasVideo) {
            setCurrentPlaybackMode(PlaybackMode.VideoPlaying);
            this.video.HandlePageVisible(bloomPage);
            this.music.pause(); // in case we have audio from previous page
        } else {
            this.playAudioAndAnimation(bloomPage);
        }
    }

    sentBloomNotification: boolean = false;

    public playAudioAndAnimation(bloomPage: HTMLElement | undefined) {
        if (this.activityManager.getActivityManagesSound()) {
            this.activityManager.doInitialSoundAndAnimation();
            return; // we don't just want to play them all, the activity code will do it selectively.
        }
        setCurrentPlaybackMode(PlaybackMode.AudioPlaying);
        if (!bloomPage) return;

        const duration = computeDuration(bloomPage);
        this.animation.HandlePageDurationAvailable(bloomPage!, duration);

        // Tail end of the method, happens at once if we're not posting, only after
        // the post completes if we are.
        const finishUp = () => {
            playAllSentences(bloomPage);
            if (Animation.pageHasAnimation(bloomPage as HTMLDivElement)) {
                this.animation.HandlePageBeforeVisible(bloomPage);
            }
            this.animation.HandlePageVisible(bloomPage);
            this.music.HandlePageVisible(bloomPage);
        };

        if (!this.sentBloomNotification) {
            this.sentBloomNotification = true; // actually we may not, but if we don't, we never want to
            //console.log("sending startRecording");

            // This notification allows Bloom to start recording video at the optimum moment,
            // when the first page is rendered enough for us to start playing its audio (if any).
            // We delay starting any animations and audio until it actually has started recording
            // (that is, the post completes).
            // Note that, if we report videos and they turn out to contain audio, Bloom will
            // display a message and the post may fail with 'canceled'.
            // Not doing anything about that because Bloom immediately closes the window
            // containing this player.
            if (this.props.shouldReportSoundLog) {
                sendStringToBloomApi(
                    "/publish/av/startRecording",
                    this.videoList
                ).then(finishUp);
                return; // don't 'finishUp' until the post returns
            }
        }
        finishUp(); // if we decided not to post to bloom api
    }

    // This seems like it should work (if media.track.enabled is set in about:config) but doesn't.
    // Maybe we need to make a similar video element in the live document? Maybe we need to load it
    // or even start playing it? Decided to try on the C# side.
    // Got somethin working with ffmpeg...thought it worth saving this attempt.
    // getHasAudioInVideo(doc: Document): boolean {
    //     for (const e of Array.from(doc.getElementsByTagName("video"))) {
    //         var tracks = (e as any).audiotracks;
    //         var ev = e as HTMLVideoElement;
    //         console.log(
    //             " video with src " +
    //                 ev.getElementsByTagName("source")[0].getAttribute("src") +
    //                 " has " +
    //                 tracks?.length +
    //                 " tracks"
    //         );
    //         if (tracks && tracks.length) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    getVideoList(doc: Document): string {
        let result = "";
        for (const e of Array.from(doc.getElementsByTagName("video"))) {
            var ev = e as HTMLVideoElement;
            var src = ev.getElementsByTagName("source")[0].getAttribute("src");
            if (result) {
                result += "|"; // illegal in file names, so should be a safe separator.
            }
            result += src;
        }
        return result;
    }
}

function htmlEncode(str: string): string {
    return str.replace("%23", "#").replace(/[\u00A0-\u9999<>\&]/gim, i => {
        return "&#" + i.charCodeAt(0) + ";";
    });
}
function doesBookHaveImageDescriptions(body: HTMLBodyElement): boolean {
    const xpath =
        "//div[contains(@class, 'bloom-imageDescription')]" +
        "/div[contains(@class, 'bloom-editable') and contains(@class, 'bloom-visibility-code-on')]" +
        "//*[contains(@class, 'audio-sentence') or contains(@class, 'bloom-highlightSegment')]";
    const imgDescDivs = body.ownerDocument!.evaluate(
        xpath,
        body,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    if (imgDescDivs.snapshotLength > 0) return true;
    // Perhaps the user never split TextBox recordings into segments for image descriptions
    // because none of them had multiple sentences.  Playback works fine without the segmentation,
    // so check for this condition as well.
    const xpath2 =
        "//div[contains(@class, 'bloom-imageDescription')]" +
        "/div[contains(@class, 'bloom-editable') and contains(@class, 'bloom-visibility-code-on') and @data-audiorecordingmode='TextBox']" +
        "/p[text()]";
    const imgDescParas = body.ownerDocument!.evaluate(
        xpath2,
        body,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    return imgDescParas.snapshotLength > 0;
}

// Relevant part of the interface we expect for the object stored as json in data-bubble-alternates.
// (There is more structure inside tails, but BP doesn't even use the tails data at all.)
interface IAlternate {
    style: string;
    tails: object[];
}
