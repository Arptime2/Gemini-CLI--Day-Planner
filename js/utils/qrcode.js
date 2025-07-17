function generateQRCode(element, text) {
    element.innerHTML = '';
    new QRCode(element, {
        text: text,
        width: 200,
        height: 200,
        correctLevel: QRCode.CorrectLevel.H
    });
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
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.setAttribute('playsinline', 'true'); // Required for iOS
            await video.play();
            requestAnimationFrame(tick);
        } catch (err) {
            console.error('Error accessing camera: ', err);
            let message = 'Could not access camera. Please ensure camera permissions are granted.';
            if (err.name === 'OverconstrainedError') {
                message = `The requested camera resolution is not supported by your device.`;
            }
            alert(`${message} Falling back to manual input.`);
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
    generateQRCode,
    scanQRCodeManual,
    scanQRCode
};