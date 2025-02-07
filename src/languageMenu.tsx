import React, { useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup
} from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import VolumeUp from "@material-ui/icons/VolumeUp";
import LangData from "./langData";

interface ILanguageMenuProps {
    languages: LangData[];
    onClose: (value: string) => void; // Handler that runs when the menu closes. ${value} is the ISO code of the language the user selected, or "" if no change was made.
}

export const LanguageMenu: React.FunctionComponent<ILanguageMenuProps> = props => {
    // the || case makes it robust against the possibility that no language is selected,
    // though this ought not to be.
    const [selectedLanguage, setSelectedLanguage] = useState(
        (
            props.languages.filter(lang => lang.IsSelected)[0] ||
            props.languages[0]
        ).Code
    );

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSelection = (event.target as HTMLInputElement).value;
        setSelectedLanguage(newSelection);
        props.onClose(newSelection);
    };

    const handleClose = () => {
        props.onClose(""); // signal closing menu w/o change
    };

    const getRadios = (): JSX.Element => {
        const controls = props.languages.map((langData: LangData) => {
            // "VolumeUp" below is the name of the material-ui icon that looks like a speaker talking.
            // We use it to signal that the language has recorded audio.
            return (
                <div className="chooserItem" key={langData.Code}>
                    <FormControlLabel
                        value={langData.Code}
                        control={<Radio />}
                        label={langData.Name}
                        checked={langData.Code === selectedLanguage}
                    />
                    <span className="spacer" />
                    <VolumeUp
                        className="icon"
                        visibility={langData.HasAudio ? "inherit" : "hidden"}
                    />
                </div>
            );
        });

        return <div className="radioGroupDiv">{controls}</div>;
    };

    return (
        <Dialog
            className="languageMenu"
            onClose={handleClose}
            aria-labelledby="language-menu-title"
            open={true}
            scroll="paper"
        >
            <DialogTitle id="language-menu-title">
                Languages in this book:
            </DialogTitle>
            <FormControl component="fieldset">
                <RadioGroup
                    className="radioGroup"
                    aria-label="languages"
                    name="languages"
                    value={selectedLanguage}
                    onChange={handleChange}
                >
                    {getRadios()}
                </RadioGroup>
            </FormControl>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LanguageMenu;
