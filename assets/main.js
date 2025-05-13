(() => {
    // footer
    const footer = document.getElementById("footerContent");

    if (footer) {
        // as innerHTML
        const randFooterContent = [
            'now with 80% less code!',
            '<span class="text-light-red">GUI Error:</span> You are pushing more GUIClips than you are popping. Make sure they are balanced.',
            '<a href="https://github.com/dotnet/roslyn">C# (dis)respect button ----&gt;</a>',
            'Isn\'t it time for the <span class="text-red-scary">spooky</span> C++?',
            '<span class="text-gradient-colors">cool text wow</span>',
            '<code>chr(sum(range(ord(min(str(not()))))))</code>'
        ];

        footer.innerHTML = randFooterContent[Math.floor(Math.random() * randFooterContent.length)];
    } else {
        console.warn("[blog] no element with id 'footerContent'");
    }

    const prevTitle = document.title;
    window.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            const unfocusTitles = [
                "Mining bitconnect...",
                "Hacking le PC...",
                "Installing 284124 npm...",
            ];
            document.title = unfocusTitles[Math.floor(Math.random() * unfocusTitles.length)];
        } else {
            document.title = prevTitle;
        }
    });
})();
