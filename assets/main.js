(() => {
    // footer
    const footer = document.getElementById("footerContent");

    if (footer) {
        // as innerHTML
        const randFooterContent = [
            '<span class="text-light-red">GUI Error:</span> You are pushing more GUIClips than you are popping. Make sure they are balanced.',
            '<span class="text-gradient-colors">cat /dev/urandom</span>',
            '<code>print(chr(sum(range(ord(min(str(not())))))))</code>'
        ];

        footer.innerHTML = randFooterContent[Math.floor(Math.random() * randFooterContent.length)];
    } else {
        console.warn("[blog] no element with id 'footerContent'");
    }
})();
