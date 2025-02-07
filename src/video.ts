import LiteEvent from "./event";
import { BloomPlayerCore } from "./bloom-player-core";
import { isMacOrIOS } from "./utilities/osUtils";
import {
    currentPlaybackMode,
    setCurrentPlaybackMode,
    PlaybackMode,
    hideVideoError,
    showVideoError
} from "./narration";
import { getPlayIcon } from "./playIcon";
import { getPauseIcon } from "./pauseIcon";
import { getReplayIcon } from "./replayIcon";

// class Video contains functionality to get videos to play properly in bloom-player

export interface IPageVideoComplete {
    page: HTMLElement;
    videos: HTMLVideoElement[];
}

export class Video {
    private currentPage: HTMLDivElement;
    private currentVideoElement: HTMLVideoElement | undefined;
    private currentVideoStartTime: number = 0;
    private isPlayingSingleVideo: boolean = false;

    public PageVideoComplete: LiteEvent<IPageVideoComplete>;

    public static pageHasVideo(page: HTMLElement): boolean {
        return !!Video.getVideoElements(page).length;
    }

    // configure one of the icons we display over videos. We put a div around it and apply
    // various classes and append it to the parent of the video.
    private wrapVideoIcon(
        videoElement: HTMLVideoElement,
        icon: HTMLElement,
        iconClass: string
    ): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.classList.add("videoControlContainer");
        wrapper.appendChild(icon);
        wrapper.classList.add(iconClass);
        icon.classList.add("videoControl");
        videoElement.parentElement?.appendChild(wrapper);
        return icon;
    }

    // Work we prefer to do before the page is visible. This makes sure that when the video
    // is loaded it will begin to play automatically.
    public HandlePageBeforeVisible(page: HTMLElement) {
        this.currentPage = page as HTMLDivElement;
        if (!Video.pageHasVideo(this.currentPage)) {
            this.currentVideoElement = undefined;
            return;
        }
        this.getVideoElements().forEach(videoElement => {
            videoElement.removeAttribute("controls");
            videoElement.addEventListener("click", this.handleVideoClick);
            const playButton = this.wrapVideoIcon(
                videoElement,
                // Alternatively, we could import the Material UI icon, make this file a TSX, and use
                // ReactDom.render to render the icon into the div. But just creating the SVG
                // ourselves (as these methods do) seems more natural to me. We would not be using
                // React for anything except to make use of an image which unfortunately is only
                // available by default as a component.
                getPlayIcon("#ffffff"),
                "videoPlayIcon"
            );
            playButton.addEventListener("click", this.handlePlayClick);
            const pauseButton = this.wrapVideoIcon(
                videoElement,
                getPauseIcon("#ffffff"),
                "videoPauseIcon"
            );
            pauseButton.addEventListener("click", this.handlePauseClick);
            const replayButton = this.wrapVideoIcon(
                videoElement,
                getReplayIcon("#ffffff"),
                "videoReplayIcon"
            );
            replayButton.addEventListener("click", this.handleReplayClick);

            // These settings are useful if we use the built-in controls.
            // videoElement.setAttribute("disablepictureinpicture", "true");
            // videoElement.setAttribute(
            //     "controlsList",
            //     "noplaybackrate nofullscreen nodownload noremoteplayback"
            // );
            // if (!videoElement.hasAttribute("playsinline")) {
            //     videoElement.setAttribute("playsinline", "true");
            // }
            if (videoElement.currentTime !== 0) {
                // in case we previously played this video and are returning to this page...
                videoElement.currentTime = 0;
            }
        });
    }

    public HandlePageVisible(bloomPage: HTMLElement) {
        this.currentPage = bloomPage as HTMLDivElement;
        if (!Video.pageHasVideo(this.currentPage)) {
            this.currentVideoElement = undefined;
            return;
        }
        if (currentPlaybackMode === PlaybackMode.VideoPaused) {
            this.currentVideoElement?.pause();
        } else {
            if (!isMacOrIOS()) {
                // Delay the start of the video by a little bit so the user can get oriented (BL-6985)
                window.setTimeout(() => {
                    this.playAllVideo(this.getVideoElements());
                }, 1000);
            } else {
                // To auto-play a video w/sound on Apple Webkit browsers, the JS that invokes video.play()
                // "must have directly resulted from a handler for touchend, click, doubleclick, or keydown"
                // (See https://webkit.org/blog/6784/new-video-policies-for-ios/)
                // The setTimeout delay in the other branch is nice to have,
                // but it prevents the video from auto-playing in Apple Webkit browsers (BL-9383).
                //
                // Currently, this code goes down this path for all videos, regardless of if they have an audio track or not.
                // In theory, videos w/o an audio track can go down the normal path instead.
                // However, when I tried to detect audio tracks, it didn't detect the correct result
                // the first time a video with audio was loaded, even when I tried checking the readyState.
                // So, for now we'll just do this for all videos on Mac or iOS, even if they don't have audio tracks.
                this.playAllVideo(this.getVideoElements());
            }
        }
    }

    private static getVideoElements(page: HTMLElement): HTMLVideoElement[] {
        return Array.from(page.getElementsByClassName("bloom-videoContainer"))
            .map(container => container.getElementsByTagName("video")[0])
            .filter(video => video !== undefined);
    }
    private getVideoElements(): HTMLVideoElement[] {
        return Video.getVideoElements(this.currentPage);
    }

    // Handles a click on the play button, or simply a click on the video itself.
    private handlePlayClick = (ev: MouseEvent) => {
        ev.stopPropagation(); // we don't want the navigation bar to toggle on and off
        ev.preventDefault();
        const video = (ev.target as HTMLElement)
            ?.closest(".bloom-videoContainer")
            ?.getElementsByTagName("video")[0];
        if (!video) {
            return; // should not happen
        }
        if (video === this.currentVideoElement) {
            this.play(); // we may have paused before all videos played, resume the sequence.
        } else {
            // a video we were not currently playing, start from the beginning.
            this.replaySingleVideo(video);
        }
    };

    private handleVideoClick = (ev: MouseEvent) => {
        const video = ev.currentTarget as HTMLVideoElement;
        if (video.paused) {
            this.handlePlayClick(ev);
        } else {
            this.handlePauseClick(ev);
        }
    };

    private handleReplayClick = (ev: MouseEvent) => {
        ev.stopPropagation(); // we don't want the navigation bar to toggle on and off
        ev.preventDefault();
        const video = (ev.target as HTMLElement)
            ?.closest(".bloom-videoContainer")
            ?.getElementsByTagName("video")[0];
        if (!video) {
            return; // should not happen
        }
        this.replaySingleVideo(video);
    };

    public play() {
        if (currentPlaybackMode === PlaybackMode.VideoPlaying) {
            return; // no change.
        }
        setCurrentPlaybackMode(PlaybackMode.VideoPlaying);
        if (this.isPlayingSingleVideo)
            this.playAllVideo([this.currentVideoElement!]);
        else this.resumePlayAllVideo();
    }

    private resumePlayAllVideo() {
        const allVideoElements = this.getVideoElements();
        let videoElements = allVideoElements;
        if (this.currentVideoElement) {
            // get subset of allVideoElements starting with currentVideoElement
            const startIndex = allVideoElements.indexOf(
                this.currentVideoElement
            );
            videoElements = allVideoElements.slice(startIndex);
        }
        this.playAllVideo(videoElements);
    }

    // This is called when the user clicks the pause button on a video.
    // Unlike when pause is done from the control bar, we add a class that shows some buttons.
    public handlePauseClick = (ev: MouseEvent) => {
        ev.stopPropagation(); // we don't want the navigation bar to toggle on and off
        ev.preventDefault();
        this.pause();
    };

    public pause() {
        if (currentPlaybackMode == PlaybackMode.VideoPaused) {
            return;
        }
        this.pauseCurrentVideo();
        setCurrentPlaybackMode(PlaybackMode.VideoPaused);
    }

    private pauseCurrentVideo() {
        // This also cleans up after the last one finishes.
        if (this.currentPage) {
            Array.from(
                this.currentPage.getElementsByClassName("playing")
            ).forEach(element => element.classList.remove("playing"));
        }
        const videoElement = this.currentVideoElement;
        if (!videoElement) {
            return; // no change
        }
        if (
            videoElement.currentTime > 0 &&
            !videoElement.paused &&
            !videoElement.ended
        ) {
            // It's playing, and we're about to stop it...report how long it's been going.
            this.reportVideoPlayed(
                videoElement.currentTime - this.currentVideoStartTime
            );
        }
        videoElement?.closest(".bloom-videoContainer")?.classList.add("paused");
        videoElement.pause();
    }

    private reportVideoPlayed(duration: number) {
        BloomPlayerCore.storeVideoAnalytics(duration);
    }

    public hidingPage() {
        this.pauseCurrentVideo(); // but don't set paused state.
    }

    public replaySingleVideo(video: HTMLVideoElement) {
        video.currentTime = 0;
        this.isPlayingSingleVideo = true;
        this.playAllVideo([video]);
    }

    // Play the specified elements, one after the other. When the last completes, raise the PageVideoComplete event.
    //
    // Note, there is a very similar function in narration.ts. It would be nice to combine them, but
    // this one must be here and must be part of the Video class so it can handle play/pause, analytics, etc.
    public playAllVideo(elements: HTMLVideoElement[]) {
        Array.from(
            this.currentPage.getElementsByClassName("playing")
        ).forEach(element => element.classList.remove("playing"));
        if (elements.length === 0) {
            this.currentVideoElement = undefined;
            this.isPlayingSingleVideo = false;
            if (this.PageVideoComplete) {
                this.PageVideoComplete.raise({
                    page: this.currentPage,
                    videos: this.getVideoElements()
                });
            }
            return;
        }

        // Remove the paused class from all videos on the page. We're playing.
        Array.from(
            this.currentPage.getElementsByClassName("paused")
        ).forEach(element => element.classList.remove("paused"));

        const video = elements[0];

        // If we somehow get into a state where the video is not on the current page, don't continue.
        const pageForVideo = video.closest(".bloom-page") as HTMLDivElement;
        if (this.currentPage !== pageForVideo) {
            this.currentVideoElement = undefined;
            return;
        }
        this.currentVideoElement = video;

        // If there is an error, try to continue with the next video.
        if (
            video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE &&
            video.readyState === HTMLMediaElement.HAVE_NOTHING
        ) {
            showVideoError(video);
            this.playAllVideo(elements.slice(1));
        } else {
            hideVideoError(video);
            setCurrentPlaybackMode(PlaybackMode.VideoPlaying);
            this.currentVideoStartTime = video.currentTime || 0;
            video.closest(".bloom-videoContainer")?.classList.add("playing");
            const promise = video.play();
            promise
                .then(() => {
                    // The promise resolves when the video starts playing. We want to know when it ends.
                    video.addEventListener(
                        "ended",
                        () => {
                            this.reportVideoPlayed(
                                video.currentTime - this.currentVideoStartTime
                            );
                            // reset it, to make it obvious it can be replayed.
                            // Note: if we decide to show a play (or any) button here, we should do it only if
                            // bloom-player-core's props.hideSwiperButtons is false, to make sure we don't
                            // get it when auto-playing to make a video.
                            video.currentTime = 0;
                            this.playAllVideo(elements.slice(1));
                        },
                        { once: true }
                    );
                })
                .catch(reason => {
                    console.error("Video play failed", reason);
                    showVideoError(video);
                    this.playAllVideo(elements.slice(1));
                });
        }
    }
}
