export const getPauseIcon = (color: string) => {
    const elt = document.createElement("div");
    // From MUI Pause
    elt.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="${color}"/>
</svg>
`;
    return elt.firstChild as HTMLElement;
};
