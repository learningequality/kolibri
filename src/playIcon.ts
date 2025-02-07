export const getPlayIcon = (color: string) => {
    const elt = document.createElement("div");
    // from MUI PlayArrow
    elt.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5v14l11-7z" fill="${color}"/>
    </svg>`;
    return elt.firstChild as HTMLElement;
};
