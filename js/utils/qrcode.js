
// Basic QR Code Generator (Text to SVG squares - NOT a full QR standard, but visually represents data)
// This is a simplified representation to avoid external libraries.
function generateQRCodeSVG(text, size = 200, margin = 10) {
    const data = text.split('').map(char => char.charCodeAt(0)); // Simple char code representation
    const cellSize = (size - 2 * margin) / Math.ceil(Math.sqrt(data.length));
    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="white" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="white"/>`; // Background

    let x = margin;
    let y = margin;
    let colCount = 0;
    const maxCols = Math.ceil(Math.sqrt(data.length));

    for (let i = 0; i < data.length; i++) {
        const charVal = data[i];
        // Use a simple threshold for black/white
        if (charVal % 2 === 0) { // Even char code for black, odd for white
            svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
        x += cellSize;
        colCount++;
        if (colCount >= maxCols) {
            x = margin;
            y += cellSize;
            colCount = 0;
        }
    }
    svg += `</svg>`;
    return svg;
}

// Simulated QR Code Scanner (prompts user for manual input)
function scanQRCodeManual() {
    return new Promise(resolve => {
        const qrData = prompt("Please manually enter the QR code data from the other device:");
        resolve(qrData);
    });
}

async function scanQRCode() {
    return new Promise(async (resolve) => {
        const video = document.createElement('video');
        const cameraContainer = document.createElement('div');
        cameraContainer.id = 'camera-feed-container';
        cameraContainer.style.position = 'relative';
        cameraContainer.style.width = '100%';
        cameraContainer.style.maxWidth = '400px';
        cameraContainer.style.margin = '0 auto';

        const canvasElement = document.createElement('canvas');
        canvasElement.style.width = '100%';
        canvasElement.style.height = 'auto';
        cameraContainer.appendChild(canvasElement);

        const instructionText = document.createElement('p');
        instructionText.textContent = 'Point your camera at a QR code.';
        instructionText.style.marginTop = '10px';
        cameraContainer.appendChild(instructionText);

        const manualInputBtn = document.createElement('button');
        manualInputBtn.className = 'button-primary';
        manualInputBtn.textContent = 'Enter Manually';
        manualInputBtn.style.marginTop = '10px';
        cameraContainer.appendChild(manualInputBtn);

        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.appendChild(cameraContainer);
        }

        const canvas = canvasElement.getContext('2d');
        let stream = null;

        const stopCamera = () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            cameraContainer.remove();
        };

        manualInputBtn.onclick = () => {
            stopCamera();
            resolve(scanQRCodeManual());
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.setAttribute('playsinline', 'true'); // Required for iOS
            await video.play();
            requestAnimationFrame(tick);
        } catch (err) {
            console.error('Error accessing camera: ', err);
            alert('Could not access camera. Please ensure camera permissions are granted. Falling back to manual input.');
            stopCamera();
            resolve(scanQRCodeManual());
        }

        function drawLine(begin, end, color) {
            canvas.beginPath();
            canvas.moveTo(begin.x, begin.y);
            canvas.lineTo(end.x, end.y);
            canvas.lineWidth = 4;
            canvas.strokeStyle = color;
            canvas.stroke();
        }

        function tick() {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvasElement.height = video.videoHeight;
                canvasElement.width = video.videoWidth;
                canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code) {
                    drawLine(code.location.topLeftCorner, code.location.topRightCorner, '#FF3B58');
                    drawLine(code.location.topRightCorner, code.location.bottomRightCorner, '#FF3B58');
                    drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, '#FF3B58');
                    drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, '#FF3B58');
                    stopCamera();
                    resolve(code.data);
                    return;
                }
            }
            requestAnimationFrame(tick);
        }
    });
}

window.qrcode = {
    generateQRCodeSVG,
    scanQRCodeManual,
    scanQRCode
};
