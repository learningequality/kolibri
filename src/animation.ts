import { DomHelper } from "./utilities/domHelper";

// class Animation captures the logic needed to produce the Ken Burns effect
// of panning an zooming as specified in Bloom's motion tool.

// Enhance: Jeffrey has some code from one of the hackathon students that
// makes the animation go at a more even pace
// Enhance: I think it might be possible to do the animation more simply with CSS transitions.

// Defines the extra fields we expect to find in the dataset of an HTMLElement
// that has animation specified (to make TypeScript and TSLint happy).
interface IAnimation {
    initialrect: string;
    finalrect: string;
}

export class Animation {
    public static pageHasAnimation(page: HTMLDivElement): boolean {
        return !!Animation.getAnimatableImageContainer(page);
    }

    // Get the animatable clone of the animatable image container, if we already made it.
    public static getAnimationView(page: HTMLElement): HTMLElement | null {
        if (
            page.firstElementChild &&
            page.firstElementChild.classList.contains("hidePage")
        ) {
            return page.firstElementChild as HTMLElement;
        }
        return null; // not made yet, or no image to make it from
    }

    // Search for an image container that has the properties we need for animation.
    public static getAnimatableImageContainer(page: HTMLElement): HTMLElement {
        return [].slice
            .call(page.getElementsByClassName("bloom-imageContainer"))
            .find(v => !!(v.dataset as IAnimation).initialrect) as HTMLElement;
    }

    public PlayAnimations: boolean; // true if animation should occur
    private currentPage: HTMLElement; // one we're currently showing
    private lastDurationPage: HTMLElement; // one we most recently obtained a duration for
    private animationView: HTMLElement; // clone of imageContainer, hides page and contains moving parts.
    private permanentRuleCount: number; // rules from initial creation of stylesheet
    // incremented for each animated div, to keep animation rules for each one distinct
    private ruleModifier: number = 0;
    private wrapperClassName = "bloom-ui-animationWrapper";
    private animationDuration: number = 3000; // ms (3000 is default)
    private pageJustMadeVisible: HTMLElement;

    constructor() {
        // 200 is designed to make sure this happens AFTER we adjust the scale.
        // Note that if we are not currently animating, this.currentPage may be null or
        // obsolete. It is only used if we need to turn OFF the animation.
        window.addEventListener("orientationchange", () =>
            window.setTimeout(() => this.adjustWrapDiv(this.currentPage), 200)
        );
    }

    // Work we prefer to do before the page is visible. This makes sure that it first
    // appears with the image container enlarged to fill the page and the image
    // zoomed to the start position for the animation.
    public HandlePageBeforeVisible(page: HTMLElement) {
        if (this.shouldAnimate(page)) {
            // We don't need to do anything. Either 'durationAvailable' or 'pageAvailable' will
            // setup the animation, whichever event occurs second.
            //this.setupAnimation(page, true);
        } else {
            // may have left-over wrappers from when page previously played.
            this.removeAnimationWrappers(page);
        }
    }

    // What we need to do when the page becomes visible (possibly start the animation,
    // if we already have the duration).
    public HandlePageVisible(page: HTMLElement) {
        if (this.shouldAnimate(page)) {
            this.pageVisible(page);
        }
    }

    // What we need to do when we get the duration of a page (possibly start the animation,
    // if the page is already visible).
    public HandlePageDurationAvailable(page: HTMLElement, duration: number) {
        if (this.shouldAnimate(page)) {
            this.animationDuration = duration;
            this.durationAvailable(page);
        }
    }

    // Only applicable to resuming paused animation (by removing the pause CSS rule)
    // May be called when we are not paused; should do nothing if so.
    public PlayAnimation() {
        if (!this.PlayAnimations) {
            return;
        }

        const stylesheet = this.getAnimationStylesheet().sheet;
        for (
            let i = 0;
            i < (stylesheet as CSSStyleSheet).cssRules.length;
            i++
        ) {
            if (
                ((stylesheet as CSSStyleSheet).cssRules[i] as CSSStyleRule)
                    .selectorText === ".bloom-pausable"
            ) {
                (stylesheet as CSSStyleSheet).deleteRule(i);
                this.permanentRuleCount--;
                return;
            }
        }
    }

    // May be called when already paused; if so do nothing.
    // Not yet tested in bloom preview context; have not yet decided affordance for pausing
    public PauseAnimation() {
        if (!this.PlayAnimations) {
            return;
        }

        const stylesheet = this.getAnimationStylesheet().sheet;
        // tslint:disable-next-line:prefer-for-of (cssRules is not an array)
        for (
            let i = 0;
            i < (stylesheet as CSSStyleSheet).cssRules.length;
            i++
        ) {
            if (
                ((stylesheet as CSSStyleSheet).cssRules[i] as CSSStyleRule)
                    .selectorText === ".bloom-pausable"
            ) {
                return; // already paused
            }
        }
        (stylesheet as CSSStyleSheet).insertRule(
            ".bloom-pausable {animation-play-state: paused; -webkit-animation-play-state: paused}",
            (stylesheet as CSSStyleSheet).cssRules.length
        );
        this.permanentRuleCount++; // not really permanent, but not to be messed with.
    }

    public setupAnimation(page: HTMLElement, beforeVisible: boolean): void {
        if (!this.PlayAnimations) {
            return;
        }

        if (!beforeVisible) {
            this.pageJustMadeVisible = page;
        }
        const animatableImageContainer = Animation.getAnimatableImageContainer(
            page
        );
        if (!animatableImageContainer) {
            return; // no image to animate
        }

        // We expect to see something like this:
        // <div class="bloom-imageContainer bloom-backgroundImage bloom-leadingElement"
        // style="background-image:url('1.jpg')"
        // title="..."
        // data-initialrect="0.3615 0.0977 0.6120 0.6149" data-finalrect="0.0000 0.0800 0.7495 0.7526"
        // data-duration="5" />
        // ...
        // </div>
        //
        // We want to make something like this:
        //      <div class="hidePage"...with all the original properties from bloom-imageContainer minus the background-image style>
        //          <div class="bloom-ui-animationWrapper" style = "width: 400px; height; 100%">
        //              <div class="bloom-animate bloom-animateN" style="background-image:url('1.jpg');
        //                  width: 400px; height; 300px"/>
        //                  ...original content...
        //              </div>
        //          </div>
        //      </div>
        // and insert it into the bloom-page div as the first element.
        let hidePageDiv = page.firstElementChild as HTMLDivElement;
        let wrapDiv: HTMLElement | null = null;

        if (!hidePageDiv || !hidePageDiv.classList.contains("hidePage")) {
            // We don't already have one and need to make it.
            // Note that this copies all the classes, so we need to be careful that css based
            // on the classes works as expected with/without hidePage.
            hidePageDiv = animatableImageContainer.cloneNode(
                true
            ) as HTMLDivElement;
            hidePageDiv.classList.add("hidePage");
            this.animationView = hidePageDiv;
            wrapDiv = document.createElement("div");
            wrapDiv.classList.add(this.wrapperClassName);
            const movingDiv = document.createElement("div");
            wrapDiv.appendChild(movingDiv);
            // hide it until we can set its size and the transform rule for its child properly.
            wrapDiv.setAttribute("style", "visibility: hidden;");

            const styleAttr = this.animationView.style;
            const img = this.animationView.getElementsByTagName("img")[0];
            let imageSrc: string | null = null;
            if (img || styleAttr) {
                if (img) {
                    // I don't think this branch has been tested, since export to bloom reader
                    // converts all images to the background-image approach.
                    imageSrc = img.getAttribute("src");
                } else if (styleAttr) {
                    movingDiv.style.backgroundImage = styleAttr.backgroundImage;
                    // Usually we make sure pictures don't have any transparency, but in case
                    // one sneaks through, this will make the transparent pixels white like they
                    // would be on paper.
                    movingDiv.style.backgroundColor = "white";
                    styleAttr.backgroundImage = "";
                    imageSrc = DomHelper.getActualUrlFromCSSPropertyValue(
                        movingDiv.style.backgroundImage
                    );
                }
                const image = new Image();
                image.addEventListener("load", () => {
                    if (image.height) {
                        // some browsers may not produce this?
                        wrapDiv!.setAttribute(
                            "data-aspectRatio",
                            (image.width / image.height).toString()
                        );
                    } else {
                        // can't get accurate size for some reason, use fall-back.
                        wrapDiv!.setAttribute(
                            "data-aspectRatio",
                            (16 / 9).toString()
                        );
                    }
                    this.updateWrapDivSize(wrapDiv!);
                    // There's a possible race condition between calling this method again
                    // with the page visible, and loading the image.
                    // If we have already made this page visible, we need to call this
                    // with beforeVisible false.
                    this.insertAnimationRules(
                        page,
                        wrapDiv!,
                        beforeVisible && page !== this.pageJustMadeVisible
                    );
                    const oldStyle = wrapDiv!.getAttribute("style")!;
                    // now we can show it.
                    wrapDiv!.setAttribute(
                        "style",
                        oldStyle.substring("visibility: hidden; ".length)
                    );
                });
                // trigger loading the image (which is not used except for the code above that listens for
                // it to be loaded). I don't think it should ever be null, but may as well play safe;
                // if we don't have an image we can't animate it.
                if (imageSrc) {
                    image.src = imageSrc;
                }
            } else {
                // Is there anything there?
                // For now, just set a default.
                wrapDiv.setAttribute("data-aspectRatio", (16 / 9).toString());
                // we're not going to make it visible when we get the size, so just do it now.
                const oldStyle = wrapDiv.getAttribute("style")!;
                wrapDiv.setAttribute(
                    "style",
                    oldStyle.substring("visibility: hidden; ".length)
                );
            }

            // If the animation view had children (typically it has none, just shows a background image),
            // move them to the inner div. Note that we must do this BEFORE we insert the wrapDiv,
            // otherwise we will be trying to move it inside itself.
            while (this.animationView.childNodes.length) {
                movingDiv.appendChild(this.animationView.childNodes[0]);
            }
            // careful here...styles of wrapDiv tend to get erased by updateWrapDivSize.
            this.animationView.appendChild(wrapDiv);
            page.insertBefore(hidePageDiv, page.firstChild);
        } else {
            // We already made the animation div, just retrieve the wrapDiv from inside it.
            this.animationView = hidePageDiv;
            wrapDiv = this.animationView.children.item(0) as HTMLElement;
        }

        // console.log(initialTransform);
        // console.log(finalTransform);
        if (wrapDiv.getAttribute("data-aspectRatio")) {
            // if we have the wrap div and have already determined its aspect ratio,
            // it might still be wrongly positioned if we changed orientation
            // since it was computed.
            this.updateWrapDivSize(wrapDiv);
            this.insertAnimationRules(page, wrapDiv, beforeVisible);
        }
        // if we ARE waiting for the wrap div aspect ratio, everything gets updated when we get it.
    }

    // We cannot be absolutely sure whether the page transition or collecting the audio lengths will
    // take longer. So we listen for both events and start the animation when we have both have
    // occurred.
    public durationAvailable(page: HTMLElement) {
        this.lastDurationPage = page;
        if (this.currentPage === this.lastDurationPage) {
            // already got the corresponding pageVisible event
            this.setupAnimation(page, false);
        }
    }

    public pageVisible(page: HTMLElement) {
        this.currentPage = page;
        if (this.currentPage === this.lastDurationPage) {
            // already got the corresponding durationAvailable event
            this.setupAnimation(page, false);
        }
    }

    // insert the rules that animate the image (or set its state during the page turn animation).
    // We hope a call with beforeVisible false happens before the image is visible,
    // but we can't do it until we get the aspect
    // ratio of the image and use it to compute the size of the wrapDiv.
    private insertAnimationRules(
        page: HTMLElement,
        wrapDiv: HTMLElement,
        beforeVisible: boolean
    ) {
        // Assign each animation div a unique number so their rules are distinct.
        // We also need a new number at least any time we're actually starting the animation, otherwise,
        // the browser doesn't see it as a new animation and doesn't run it.
        // The simplest thing, however, is to just get a new animation style name each time we are called,
        // and then, the last thing we do is apply that class to the div we want our new rules
        // to apply to. This immediately disables any previous rules (whose class our div no longer
        // has) and applies the new ones, which are always seen as new so always start an
        // animation if applicable. The initial-state rule applies right up to the moment we
        // change the style name and trigger the actual animation.
        const ruleMod = "" + this.ruleModifier++;

        const animateStyleName = "bloom-animate" + ruleMod;
        const movePicName = "movepic" + ruleMod;
        // Figure out the transforms needed to bring about the animation. These are relative to the size of the
        // wrapDiv which clips the animation, so we can't compute it until we set that size, which in turn
        // sometimes has to wait until we get the aspect ratio of the image.
        const stylesheet = this.getAnimationStylesheet().sheet;
        // tslint is so surprised by this cast that it complains without the preliminary "as any"
        const initialRectStr = ((this.animationView
            .dataset as any) as IAnimation).initialrect;

        //Fetch the data from the dataset and reformat into scale width and height along with offset x and y
        const initialRect = initialRectStr.split(" ");
        const initialScaleWidth = 1 / parseFloat(initialRect[2]);
        const initialScaleHeight = 1 / parseFloat(initialRect[3]);
        const finalRect = ((this.animationView
            .dataset as any) as IAnimation).finalrect.split(" ");
        const finalScaleWidth = 1 / parseFloat(finalRect[2]);
        const finalScaleHeight = 1 / parseFloat(finalRect[3]);

        // remove obsolete rules. We want to keep the permanent rules and the ones for the previous page
        // (which may still be visible). That's at most 2. It's harmless to keep an extra one.
        while (
            (stylesheet as CSSStyleSheet).cssRules.length >
            this.permanentRuleCount + 4
        ) {
            // remove the last (oldest, since we add at start) non-permanent rule
            (stylesheet as CSSStyleSheet).deleteRule(
                (stylesheet as CSSStyleSheet).cssRules.length -
                    this.permanentRuleCount -
                    1
            );
        }
        const wrapDivWidth = wrapDiv.clientWidth;
        const wrapDivHeight = wrapDiv.clientHeight;
        const initialX = parseFloat(initialRect[0]) * wrapDivWidth;
        const initialY = parseFloat(initialRect[1]) * wrapDivHeight;
        const finalX = parseFloat(finalRect[0]) * wrapDivWidth;
        const finalY = parseFloat(finalRect[1]) * wrapDivHeight;

        // Will take the form of "scale3d(W, H,1.0) translate3d(Xpx, Ypx, 0px)"
        // Using 3d scale and transform apparently causes GPU to be used and improves
        // performance over scale/transform. (https://www.kirupa.com/html5/ken_burns_effect_css.htm)
        // May also help with blurring of material originally hidden.
        const initialTransform =
            "scale3d(" +
            initialScaleWidth +
            ", " +
            initialScaleHeight +
            ", 1.0) translate3d(" +
            -initialX +
            "px, " +
            -initialY +
            "px, 0px)";
        const finalTransform =
            "scale3d(" +
            finalScaleWidth +
            ", " +
            finalScaleHeight +
            ", 1.0) translate3d(" +
            -finalX +
            "px, " +
            -finalY +
            "px, 0px)";

        if (
            page !== this.currentPage ||
            page !== this.lastDurationPage ||
            beforeVisible
        ) {
            // We aren't ready to start the animation, either because we haven't yet
            // been told the duration of this page, or we haven't yet been told to treat
            // it as visible.
            // this rule puts it in the initial state for the animation, so we get a smooth
            // transition when the animation starts. Don't start THIS animation, though,
            // until the page-turn one completes (or, for android, till we get the signal to start).
            (stylesheet as CSSStyleSheet).insertRule(
                "." +
                    animateStyleName +
                    " { transform-origin: 0px 0px; transform: " +
                    initialTransform +
                    ";}",
                0
            );
        } else {
            //Insert the keyframe animation rule with the dynamic begin and end set
            (stylesheet as CSSStyleSheet).insertRule(
                "@keyframes " +
                    movePicName +
                    " { from{ transform-origin: 0px 0px; transform: " +
                    initialTransform +
                    "; } to{ transform-origin: 0px 0px; transform: " +
                    finalTransform +
                    "; } }",
                0
            );

            //Insert the css for the imageView div that utilizes the newly created animation
            (stylesheet as CSSStyleSheet).insertRule(
                "." +
                    animateStyleName +
                    " { transform-origin: 0px 0px; transform: " +
                    initialTransform +
                    "; animation-name: " +
                    movePicName +
                    "; animation-duration: " +
                    // Making the animation take an extra second lets the movement
                    // continue smoothly into the fade to the next page.
                    // (Currently all these these things go together: if we are doing animation,
                    // then we are autoplaying and we fade from one page to the next. If these things
                    // become separately controllable, we might not always want an extra second
                    // of animation.)
                    (this.animationDuration + 1) +
                    "s; animation-fill-mode: forwards; " +
                    "animation-timing-function: linear;}",
                1
            );
        }
        // Give this rule the class bloom-animate to trigger the rule created in getAnimationStylesheet,
        // and bloom-animationN to trigger the one we just created for page-and-occurence-specific animation.
        // Changing the style name also has the effect of disabling any beforeVisible rule.
        // A separate class for pausing the animation makes it easier to add and remove the relevant rules.
        const movingDiv = wrapDiv.childNodes[0] as HTMLElement;
        movingDiv.setAttribute(
            "class",
            "bloom-animate bloom-pausable " + animateStyleName
        );
    }

    // Enhance: some of the calculations here may require adjustment if we ever do
    // animation while scaled. Currently we use a different system to make the
    // image container fill the viewport when animating, and suppress scaling.
    // So we can ignore that factor.
    private updateWrapDivSize(wrapDiv: HTMLElement) {
        const imageAspectRatio = parseFloat(
            wrapDiv.getAttribute("data-aspectRatio")!
        );
        const viewWidth = this.animationView.clientWidth; // getBoundingClientRect().width;
        const viewHeight = this.animationView.clientHeight; // getBoundingClientRect().height;
        const viewAspectRatio = viewWidth / viewHeight;
        let oldStyle = wrapDiv.getAttribute("style")!; // may have visibility: hidden, which we need.
        // If it has anything else (e.g., dimensions for a different orientation), remove them.
        oldStyle =
            oldStyle.substring(0, "visibility: hidden;".length) ===
            "visibility: hidden;"
                ? "visibility: hidden;"
                : "";
        if (imageAspectRatio < viewAspectRatio) {
            // black bars on side
            const imageWidth = viewHeight * imageAspectRatio;
            wrapDiv.setAttribute(
                "style",
                oldStyle +
                    " height: 100%; width: " +
                    imageWidth +
                    "px; left: " +
                    (viewWidth - imageWidth) / 2 +
                    "px"
            );
        } else {
            // black bars top and bottom
            const imageHeight = viewWidth / imageAspectRatio;
            wrapDiv.setAttribute(
                "style",
                oldStyle +
                    " width: 100%; height: " +
                    imageHeight +
                    "px; top: " +
                    (viewHeight - imageHeight) / 2 +
                    "px"
            );
        }
    }

    // Adjust the wrap div for a change of orientation. The name is slightly obsolete
    // since currently we don't continue the animation if we change to portrait mode,
    // where animation is disabled. And if we change to landscape mode, we don't try
    // to start up the animation in the middle of the narration. So all it really
    // has to do currently is REMOVE the animation stuff if changing to portrait.
    // However, since everything else is built around shouldAnimatePage, it seemed
    // worth keeping the logic that adjusts things if we ever go from one animated
    // orientation to another. Note, however, that the 'page' argument passed is not
    // currently valid if turning ON animation. Thus, we will need to do more to get
    // the right page if we want to turn animation ON while switching to horizontal.
    private adjustWrapDiv(page: HTMLElement): void {
        if (!page) {
            return;
        }
        if (!this.shouldAnimate(page)) {
            // we may have a left-over wrapDiv from animating in the other orientation,
            // which could confuse things.
            this.removeAnimationWrappers(page);
            return;
        }
        // Nothing to do if we don't have a wrap div currently.
        const wrapDiv = this.getWrapDiv(page);
        if (!wrapDiv) {
            return;
        }
        this.updateWrapDivSize(wrapDiv);
    }

    private getWrapDiv(page: HTMLElement): HTMLElement | null {
        if (!page) {
            return null;
        }
        const animationDiv = Animation.getAnimationView(page);
        if (!animationDiv || animationDiv.children.length !== 1) {
            return null;
        }
        const wrapDiv = animationDiv.firstElementChild as HTMLElement;
        if (!wrapDiv.classList.contains(this.wrapperClassName)) {
            return null;
        }
        return wrapDiv;
    }

    private removeAnimationWrappers(page: HTMLElement) {
        if (
            page.firstElementChild &&
            page.firstElementChild.classList.contains("hidePage")
        ) {
            page.removeChild(page.firstElementChild);
        }
    }

    private getAnimationStylesheet(): HTMLStyleElement {
        let animationElement = document.getElementById("animationSheet");
        if (!animationElement) {
            animationElement = document.createElement("style");
            animationElement.setAttribute("type", "text/css");
            animationElement.setAttribute("id", "animationSheet");
            animationElement.innerText =
                ".bloom-ui-animationWrapper {overflow: hidden; translateZ(0)} " +
                ".bloom-animate {height: 100%; width: 100%; " +
                "background-repeat: no-repeat; background-size: contain}";
            document.body.appendChild(animationElement);
            this.permanentRuleCount = 2; // (<CSSStyleSheet> <any> animationElement).cssRules.length;
        }
        return animationElement as HTMLStyleElement;
    }

    private shouldAnimate(page: HTMLElement): boolean {
        return (
            this.PlayAnimations &&
            page.getAttribute("class")!.indexOf("Landscape") >= 0
        );
    }
}
