import React, { useState } from "react";

// We'd prefer to use this more elegant form of import:
//import { AppBar, Toolbar, IconButton } from "@material-ui/core";
// import {
//     ArrowBack,
//     PlayCircleOutline,
//     PauseCircleOutline
// } from "@material-ui/icons";
// However, @material-ui doc indicates that the second-level imports are supported,
// and using the first-level ones has unfortunate consequences on build times and sizes.
// It takes roughly twice as long to build our bundles, and they end up roughly
// ten times bigger, and the extra time to load those bigger bundles is definitely
// noticeable.
// The latter two effects probably indicate that I have not yet figured out how to
// configure webpack to really do tree-shaking, even in our production build.

import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import ArrowBack from "@material-ui/icons/ArrowBack";
import MoreHoriz from "@material-ui/icons/MoreHoriz";
import PlayCircleOutline from "@material-ui/icons/PlayCircleOutline";
import PauseCircleOutline from "@material-ui/icons/PauseCircleOutline";
import Language from "@material-ui/icons/Language";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";
import { ImageDescriptionIcon } from "./imageDescriptionIcon";

import theme, { bloomYellow } from "./bloomPlayerTheme";
import { ThemeProvider } from "@material-ui/styles";
import { createTheme } from "@material-ui/core/styles";

import LanguageMenu from "./languageMenu";
import LangData from "./langData";
import { sendMessageToHost } from "./externalContext";
import { sendStringToBloomApi } from "./videoRecordingSupport";
import { LocalizationManager } from "./l10n/localizationManager";

// react control (using hooks) for the bar of controls across the top of a bloom-player-controls

export interface IExtraButton {
    id: string; // passed as messageType param to postMessage when button is clicked
    iconUrl: string; // URL for displaying the button icon
    description?: string; // title to show with the icon; also aria attribute
    // enhance as needed: location:"farRight|nearRight|farLeft"; // default: farRight
}

interface IControlBarProps {
    visible: boolean; // will slide into / out of view based on this
    paused: boolean;
    pausedChanged?: (b: boolean) => void;
    showPlayPause: boolean;
    playLabel: string;
    preferredLanguages: string[];
    canShowFullScreen: boolean;
    backClicked?: () => void;
    canGoBack: boolean;
    bookLanguages: LangData[];
    activeLanguageCode: string;
    onLanguageChanged: (language: string) => void;
    extraButtons?: IExtraButton[];
    bookHasImageDescriptions: boolean;
    readImageDescriptions: boolean;
    onReadImageDescriptionToggled: () => void;
    nowReadingImageDescription: boolean;
    // Indicates the player is being used in the Bloom Editor video recording preview window.
    // Controls that don't affect how the book will be played for recording are hidden.
    // Changes to the controls that DO affect recording will be reported to Bloom Editor's API.
    videoPreviewMode?: boolean;
}

// Data we send to BloomEditor and get in a URL param in the Video Recording publish tab.
// Extend if we get more relevant controls.
// All props are always set when passing to BE, but individual controls may set just one
// when passing to reportVideoSettings.
export interface IVideoSettings {
    lang?: string;
    imageDescriptions?: boolean;
}

export const ControlBar: React.FunctionComponent<IControlBarProps> = props => {
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

    // The "single" class triggers the change in color of the globe icon
    // in the LanguageMenu.
    const controlButtonClass =
        "button" + (props.bookLanguages.length < 2 ? " disabled" : "");

    const handleCloseLanguageMenu = (isoCode: string) => {
        setLanguageMenuOpen(false);
        if (isoCode !== "") {
            props.onLanguageChanged(isoCode);
            reportVideoSettings({ lang: isoCode });
        }
    };

    const toggleFullScreen = () => {
        // See https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API.
        try {
            // Doc suggests also trying prefixes ms and moz; but I can't find any current browsers that require this
            if (
                document.fullscreenElement != null ||
                (document as any).webkitFullscreenElement != null
            ) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if ((document as any).webkitExitFullScreen) {
                    (document as any).webkitExitFullScreen(); // Safari, maybe Chrome on IOS?
                }
            } else {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (
                    (document.documentElement as any).webkitRequestFullscreen
                ) {
                    (document.documentElement as any).webkitRequestFullscreen();
                }
            }
        } catch (e) {
            console.error("RequestFullScreen failed: ", e);
        }
    };

    // If this BP instance is being used as a preview in the Record Video publish tab of Bloom Editor,
    // report to BE the current state of settings which need to be persisted and passed to the
    // record video window. This string is opaque to BE, but comes back to us through the url param
    // videoSettings, so it must be URL encoded.
    // If not all values are set in newSettings, others are taken from our own props.
    // All current values are reported.
    const reportVideoSettings = (newSettings: IVideoSettings) => {
        if (!props.videoPreviewMode) {
            return;
        }
        const settings: IVideoSettings = {
            lang: props.activeLanguageCode,
            imageDescriptions: props.readImageDescriptions,
            ...newSettings
        };
        // To achieve our goal that Bloom Editor can send this string back to another instance
        // of BP through the videoSettings URL param without needing to interpret its contents,
        // we want to make it a simple string that is already suitably encoded for a URL param.
        // If Bloom Editor was intended to interpret it, it would be more natural to simply pass
        // it as JSON; but then Bloom Editor would have to know how to re-encode it as a URL param.
        sendStringToBloomApi(
            "publish/av/videoSettings",
            encodeURIComponent(JSON.stringify(settings))
        );
    };

    const pauseLabel = LocalizationManager.getTranslation(
        "Audio.Pause",
        props.preferredLanguages,
        "Pause"
    );

    const playOrPause = props.paused ? (
        <PlayCircleOutline titleAccess={props.playLabel} />
    ) : (
        <PauseCircleOutline titleAccess={pauseLabel} />
    );

    const readImageDescriptions = LocalizationManager.getTranslation(
        "Button.ReadImageDescriptions",
        props.preferredLanguages,
        "Read Image Descriptions"
    );

    const ignoreImageDescriptions = LocalizationManager.getTranslation(
        "Button.IgnoreImageDescriptions",
        props.preferredLanguages,
        "Ignore Image Descriptions"
    );

    // A modified Mui theme just for the image description icon.
    // Secondary is the normal bloom red.
    // Primary is whatever color the icon should be when we are reading an image description.
    // In this case, I've used the same yellow that's used for audio highlighting.
    const imageDescIconTheme = createTheme({
        palette: {
            primary: { main: bloomYellow },
            secondary: { main: theme.palette.secondary.main }
        }
    });

    // Using a Mui SvgIcon object here (the "ImageDescriptionIcon") simplifies opacity, accessibility
    // and tooltips, but means we have to use the above partial theme to modify the color.
    // SvgIcon's don't take color strings for fill or color attributes, but just access 'primary' and
    // 'secondary' as palette colors.
    const readImageDescriptionsOrNot: JSX.Element = (
        <ThemeProvider theme={imageDescIconTheme}>
            <ImageDescriptionIcon
                aria-label={
                    props.readImageDescriptions
                        ? "Read image descriptions"
                        : "Ignore image descriptions"
                }
                titleAccess={
                    props.readImageDescriptions
                        ? ignoreImageDescriptions
                        : readImageDescriptions
                }
                opacity={props.readImageDescriptions ? 1 : 0.38}
                color={
                    props.nowReadingImageDescription ? "primary" : "secondary"
                }
            />
        </ThemeProvider>
    );

    const extraButtons = props.extraButtons
        ? props.extraButtons.map(eb => (
              <IconButton
                  key={eb.id}
                  color="secondary"
                  title={eb.description}
                  onClick={() => sendMessageToHost({ messageType: eb.id })}
              >
                  <img
                      style={{ maxHeight: "24px", maxWidth: "24px" }}
                      src={eb.iconUrl}
                  />
              </IconButton>
          ))
        : undefined;

    return (
        <AppBar
            color="primary"
            className={`control-bar ${props.visible ? ", visible" : ""}`}
            id="control-bar"
            elevation={0}
            position="relative" // Keeps the AppBar from floating
        >
            <Toolbar>
                {// The logic here is:
                // - Bloom reader: window === window.top, canGoBack true => Arrow
                // - Bloom Library, came from detail view: don't need a button at all,
                // (use browser back button), canGoBack will be passed false.
                // - Bloom library, not from detail view: canGoBack is true, but not really going back;
                // it will go to detail view ("more") which in this case is not 'back'.
                // We may eventually want separate canShowMore and moreClicked props
                // but for now it feels like more complication than we need.
                props.canGoBack && !props.videoPreviewMode && (
                    <IconButton
                        color="secondary"
                        onClick={() => {
                            if (props.backClicked) {
                                props.backClicked();
                            }
                        }}
                    >
                        {window === window.top ? (
                            <ArrowBack
                                aria-label="Go Back"
                                titleAccess={LocalizationManager.getTranslation(
                                    "Button.Back",
                                    props.preferredLanguages,
                                    "Back"
                                )}
                            />
                        ) : (
                            <MoreHoriz
                                aria-label="More Menu"
                                titleAccess={LocalizationManager.getTranslation(
                                    "Button.More",
                                    props.preferredLanguages,
                                    "More"
                                )}
                            />
                        )}
                    </IconButton>
                )}
                <div
                    className="filler" // this is set to flex-grow, making the following icons right-aligned.
                />
                {props.bookHasImageDescriptions && (
                    <IconButton
                        onClick={() => {
                            props.onReadImageDescriptionToggled();
                            reportVideoSettings({
                                imageDescriptions: !props.readImageDescriptions
                            });
                        }}
                    >
                        {readImageDescriptionsOrNot}
                    </IconButton>
                )}
                {props.bookLanguages.length > 1 && (
                    <IconButton
                        className={controlButtonClass}
                        aria-label="Choose Language"
                        color={"secondary"}
                        onClick={() => {
                            setLanguageMenuOpen(true);
                        }}
                    >
                        <Language
                            titleAccess={LocalizationManager.getTranslation(
                                "Button.ChooseLanguage",
                                props.preferredLanguages,
                                "Choose Language"
                            )}
                        />
                    </IconButton>
                )}
                {languageMenuOpen && (
                    <LanguageMenu
                        languages={props.bookLanguages}
                        onClose={handleCloseLanguageMenu}
                    />
                )}
                {!props.videoPreviewMode && (
                    <IconButton
                        color="secondary"
                        aria-label="PlayPause"
                        onClick={() => {
                            if (props.pausedChanged) {
                                props.pausedChanged(!props.paused);
                            }
                        }}
                    >
                        {props.showPlayPause ? playOrPause : null}
                    </IconButton>
                )}
                {extraButtons}
                {document.fullscreenEnabled &&
                    props.canShowFullScreen &&
                    !props.videoPreviewMode && (
                        <IconButton
                            color="secondary"
                            onClick={() => toggleFullScreen()}
                        >
                            {document.fullscreenElement == null ? (
                                <Fullscreen
                                    aria-label="Full Screen"
                                    titleAccess={LocalizationManager.getTranslation(
                                        "Button.FullScreen",
                                        props.preferredLanguages,
                                        "Full Screen"
                                    )}
                                />
                            ) : (
                                <FullscreenExit
                                    aria-label="Exit Full Screen"
                                    titleAccess={LocalizationManager.getTranslation(
                                        "Button.ExitFullScreen",
                                        props.preferredLanguages,
                                        "Exit Full Screen"
                                    )}
                                />
                            )}
                        </IconButton>
                    )}
            </Toolbar>
        </AppBar>
    );
};
