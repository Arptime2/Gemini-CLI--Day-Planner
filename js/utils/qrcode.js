
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
        video.style.width = '100%';
        video.style.height = 'auto';
        video.autoplay = true;
        video.playsInline = true;

        const cameraContainer = document.createElement('div');
        cameraContainer.id = 'camera-feed-container';
        cameraContainer.style.textAlign = 'center';
        cameraContainer.appendChild(video);

        const manualInputBtn = document.createElement('button');
        manualInputBtn.className = 'button-primary';
        manualInputBtn.textContent = 'Enter Manually';
        manualInputBtn.style.marginTop = '10px';

        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.appendChild(cameraContainer);
            modalContent.appendChild(manualInputBtn);
        }

        manualInputBtn.onclick = () => {
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            cameraContainer.remove();
            manualInputBtn.remove();
            resolve(scanQRCodeManual());
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
            };
            alert("Point your camera at the QR code. You will need to manually enter the data you see.");
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert("Could not access camera. Please ensure camera permissions are granted. Falling back to manual input.");
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            cameraContainer.remove();
            manualInputBtn.remove();
            resolve(scanQRCodeManual());
        }
    });
}

window.qrcode = {
    generateQRCodeSVG,
    scanQRCodeManual,
    scanQRCode
};
