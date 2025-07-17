window.datamatrix = {
    generate: function(element, text) {
        element.innerHTML = '';
        const svg = DATAMatrix({ msg: text });
        element.appendChild(svg);
    },
    scan: async function() {
        return new Promise(async (resolve) => {
            const video = document.createElement('video');
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.backgroundColor = 'black';
            container.style.zIndex = '1001';
            container.appendChild(video);
            document.body.appendChild(container);

            const codeReader = new ZXingBrowser.BrowserDatamatrixCodeReader();
            try {
                const result = await codeReader.decodeFromInputVideoDevice(undefined, video);
                container.remove();
                resolve(result.getText());
            } catch (err) {
                container.remove();
                resolve(null); // Resolve with null if scanning is cancelled or fails
            }
        });
    }
};