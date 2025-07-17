/*
 * QR Code generator library (MIT License)
 * Copyright (c) 2021 Nayuki
 * https://www.nayuki.io/page/qr-code-generator-library
 */
"use strict";

const qrcodegen = (function() {
	const QrCode = (function() {

		function QrCode(seg, ecl, minVersion, maxVersion, mask, boostEcl) {
			this.version = 0;
			this.size = 0;
			this.errorCorrectionLevel = ecl;
			this.mask = -1;
			this.modules = []; // The grid of modules. true = black, false = white
			this.isFunction = []; // The grid of function modules

			let dataCodewords = QrCode.encodeSegments(seg, ecl);

			let dataCapacityBits = 0;
			for (let i = minVersion; i <= maxVersion; i++) {
				let temp = QrCode.getNumDataCodewords(i, ecl);
				let temp2 = QrCode.getNumRawDataModules(i) / 8;
				if (temp < temp2) temp = temp2;
				if (dataCodewords.length <= temp) {
					dataCapacityBits = temp * 8;
					this.version = i;
					break;
				}
				if (i == maxVersion) throw "Data too long";
			}

			let allCodewords = [];
			for (let b of dataCodewords) allCodewords.push(b);

			let dataLen = dataCodewords.length;
			let dataCapacity = dataCapacityBits / 8;
			allCodewords.push(112); // Terminator
			while (allCodewords.length % 8 != 0)
				allCodewords.push(0);
			for (let pad = 236; allCodewords.length < dataCapacity; pad ^= 237) {
				allCodewords.push(pad);
			}

			let ecc = QrCode.reedSolomonCompute(allCodewords, this.version, ecl);
			let result = [];
			let numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][this.version];
			let blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][this.version];
			let rawCodewords = Math.floor(QrCode.getNumRawDataModules(this.version) / 8);
			let numShortBlocks = numBlocks - rawCodewords % numBlocks;
			let shortBlockLen = Math.floor(rawCodewords / numBlocks);

			let blocks = [];
			let k = 0;
			for (let i = 0; i < numBlocks; i++) {
				let dat = allCodewords.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
				k += dat.length;
				blocks.push(dat);
			}

			for (let i = 0; i < blocks.length; i++)
				blocks[i] = QrCode.reedSolomonCompute(blocks[i], this.version, ecl);

			let z = 0;
			for (let i = 0; i < shortBlockLen; i++) {
				for (let j = 0; j < numBlocks; j++) {
					if (i != shortBlockLen - blockEccLen || j >= numShortBlocks)
						result.push(blocks[j][i]);
				}
			}
			for (let i = 0; i < blockEccLen; i++) {
				for (let j = 0; j < numBlocks; j++) {
					result.push(blocks[j][shortBlockLen - blockEccLen + i]);
				}
			}
			this.size = this.version * 4 + 17;
			this.modules = [];
			for (let i = 0; i < this.size; i++) this.modules.push(new Array(this.size).fill(false));
			this.isFunction = [];
			for (let i = 0; i < this.size; i++) this.isFunction.push(new Array(this.size).fill(false));

			this.drawFunctionPatterns();
			this.drawCodewords(result);

			if (mask == -1) { // Auto-select best mask
				let minPenalty = 1e9;
				for (let i = 0; i < 8; i++) {
					this.applyMask(i);
					this.drawFormatBits(i);
					let penalty = this.getPenaltyScore();
					if (penalty < minPenalty) {
						this.mask = i;
						minPenalty = penalty;
					}
					this.applyMask(i); // Undoes the mask due to XOR
				}
			}
			this.applyMask(mask);
			this.drawFormatBits(mask);

			this.isFunction = null;
		}

		getModule(x, y) {
			return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y][x];
		}

		drawFunctionPatterns() {
			// Draw the finder patterns
			for (let i = -1; i <= 1; i++) {
				for (let j = -1; j <= 1; j++) {
					let r = Math.max(Math.abs(i), Math.abs(j));
					this.setFunctionModule(6 + i, 6 + j, r != 1);
					this.setFunctionModule(this.size - 7 + i, 6 + j, r != 1);
					this.setFunctionModule(6 + i, this.size - 7 + j, r != 1);
				}
			}

			// Draw the alignment patterns
			let alignPatPos = QrCode.getAlignmentPatternPositions(this.version);
			let numAlign = alignPatPos.length;
			for (let i = 0; i < numAlign; i++) {
				for (let j = 0; j < numAlign; j++) {
					if (i == 0 && j == 0 || i == 0 && j == numAlign - 1 || i == numAlign - 1 && j == 0)
						continue; // Skip the finder patterns
					for (let k = -2; k <= 2; k++) {
						for (let l = -2; l <= 2; l++) {
							this.setFunctionModule(alignPatPos[i] + k, alignPatPos[j] + l, Math.max(Math.abs(k), Math.abs(l)) != 1);
						}
					}
				}
			}

			// Draw the timing patterns
			for (let i = 0; i < this.size; i++) {
				this.setFunctionModule(6, i, i % 2 == 0);
				this.setFunctionModule(i, 6, i % 2 == 0);
			}

			// Draw the dark module and format bits
			this.setFunctionModule(8, this.size - 8, true);
			this.drawFormatBits(0); // Dummy mask value
			this.drawVersion();
		}

		drawFormatBits(mask) {
			let data = this.errorCorrectionLevel.formatBits << 3 | mask; // errCorrLvl is 2 bits, mask is 3 bits
			let rem = data;
			for (let i = 0; i < 10; i++)
				rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
			data = data << 10 | rem;
			data ^= 0x5412; // Apply final XOR mask

			// Draw the 15 bits
			for (let i = 0; i <= 5; i++)
				this.setFunctionModule(8, i, ((data >>> i) & 1) != 0);
			this.setFunctionModule(8, 7, ((data >>> 6) & 1) != 0);
			this.setFunctionModule(8, 8, ((data >>> 7) & 1) != 0);
			this.setFunctionModule(7, 8, ((data >>> 8) & 1) != 0);
			for (let i = 9; i < 15; i++)
				this.setFunctionModule(14 - i, 8, ((data >>> i) & 1) != 0);

			for (let i = 0; i < 8; i++)
				this.setFunctionModule(this.size - 1 - i, 8, ((data >>> i) & 1) != 0);
			for (let i = 8; i < 15; i++)
				this.setFunctionModule(8, this.size - 15 + i, ((data >>> i) & 1) != 0);
			this.setFunctionModule(8, this.size - 8, true); // Always dark
		}

		drawVersion() {
			if (this.version < 7)
				return;

			let rem = this.version;
			for (let i = 0; i < 12; i++)
				rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
			let data = this.version << 12 | rem;

			for (let i = 0; i < 18; i++) {
				let bit = ((data >>> i) & 1) != 0;
				let a = this.size - 11 + i % 3;
				let b = Math.floor(i / 3);
				this.setFunctionModule(a, b, bit);
				this.setFunctionModule(b, a, bit);
			}
		}

		drawCodewords(data) {
			let i = 0;
			for (let right = this.size - 1; right >= 1; right -= 2) {
				if (right == 6) right = 5;
				for (let vert = 0; vert < this.size; vert++) {
					for (let j = 0; j < 2; j++) {
						let x = right - j;
						let upward = ((right + 1) & 2) == 0;
						let y = upward ? this.size - 1 - vert : vert;
						if (!this.isFunction[y][x] && i < data.length * 8) {
							this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) != 0;
							i++;
						}
					}
				}
			}
		}

		setFunctionModule(x, y, isBlack) {
			this.modules[y][x] = isBlack;
			this.isFunction[y][x] = true;
		}

		applyMask(mask) {
			for (let y = 0; y < this.size; y++) {
				for (let x = 0; x < this.size; x++) {
					let invert;
					switch (mask) {
						case 0: invert = (x + y) % 2 == 0; break;
						case 1: invert = y % 2 == 0; break;
						case 2: invert = x % 3 == 0; break;
						case 3: invert = (x + y) % 3 == 0; break;
						case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0; break;
						case 5: invert = x * y % 2 + x * y % 3 == 0; break;
						case 6: invert = (x * y % 2 + x * y % 3) % 2 == 0; break;
						case 7: invert = ((x + y) % 2 + x * y % 3) % 2 == 0; break;
						default: throw "Invalid mask";
					}
					if (!this.isFunction[y][x] && invert)
						this.modules[y][x] = !this.modules[y][x];
				}
			}
		}

		getPenaltyScore() {
			let result = 0;

			// Adjacent modules in row/column having same color
			for (let y = 0; y < this.size; y++) {
				let runColor = false;
				let runX = 0;
				for (let x = 0; x < this.size; x++) {
					if (this.modules[y][x] == runColor) {
						runX++;
						if (runX == 5)
							result += 3;
						else if (runX > 5)
							result++;
					} else {
						runColor = this.modules[y][x];
						runX = 1;
					}
				}
			}
			for (let x = 0; x < this.size; x++) {
				let runColor = false;
				let runY = 0;
				for (let y = 0; y < this.size; y++) {
					if (this.modules[y][x] == runColor) {
						runY++;
						if (runY == 5)
							result += 3;
						else if (runY > 5)
							result++;
					} else {
						runColor = this.modules[y][x];
						runY = 1;
					}
				}
			}

			// 2*2 blocks of modules having same color
			for (let y = 0; y < this.size - 1; y++) {
				for (let x = 0; x < this.size - 1; x++) {
					let color = this.modules[y][x];
					if (color == this.modules[y][x + 1] &&
						color == this.modules[y + 1][x] &&
						color == this.modules[y + 1][x + 1])
						result += 3;
				}
			}

			// Finder-like patterns
			for (let y = 0; y < this.size; y++) {
				for (let x = 0; x < this.size - 6; x++) {
					if (this.modules[y][x] &&
						!this.modules[y][x + 1] &&
						this.modules[y][x + 2] &&
						this.modules[y][x + 3] &&
						this.modules[y][x + 4] &&
						!this.modules[y][x + 5] &&
						this.modules[y][x + 6])
						result += 40;
				}
			}
			for (let x = 0; x < this.size; x++) {
				for (let y = 0; y < this.size - 6; y++) {
					if (this.modules[y][x] &&
						!this.modules[y + 1][x] &&
						this.modules[y + 2][x] &&
						this.modules[y + 3][x] &&
						this.modules[y + 4][x] &&
						!this.modules[y + 5][x] &&
						this.modules[y + 6][x])
						result += 40;
				}
			}

			// Balance of black and white modules
			let black = 0;
			for (let y = 0; y < this.size; y++) {
				for (let x = 0; x < this.size; x++) {
					if (this.modules[y][x])
						black++;
				}
			}
			let total = this.size * this.size;
			let k = Math.floor(Math.abs(black * 20 - total * 10) / total) - 1;
			result += k * 10;
			return result;
		}

		static getAlignmentPatternPositions(ver) {
			if (ver == 1) return [];
			else {
				let numAlign = Math.floor(ver / 7) + 2;
				let step = (ver == 32) ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
				let result = [6];
				for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step)
					result.splice(1, 0, pos);
				return result;
			}
		}

		static getNumRawDataModules(ver) {
			let result = (16 * ver + 128) * ver + 64;
			if (ver >= 2) {
				let numAlign = Math.floor(ver / 7) + 2;
				result -= (25 * numAlign - 10) * numAlign - 55;
				if (ver >= 7)
					result -= 36;
			}
			return result;
		}

		static getNumDataCodewords(ver, ecl) {
			return Math.floor(QrCode.getNumRawDataModules(ver) / 8) - QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
		}

		static reedSolomonCompute(data, ver, ecl) {
			let gen = QrCode.reedSolomonGetGenerator(QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver]);
			let result = new Array(gen.length - 1).fill(0);
			for (let i = 0; i < data.length; i++) {
				let val = data[i] ^ result.shift();
				result.push(0);
				for (let j = 0; j < gen.length - 1; j++)
					result[j] ^= QrCode.reedSolomonMultiply(gen[j], val);
			}
			return result;
		}

		static reedSolomonGetGenerator(degree) {
			if (degree < 1 || degree > 255) throw "Degree out of range";
			let result = [1];
			for (let i = 0; i < degree; i++) {
				let temp = new Array(result.length + 1).fill(0);
				for (let j = 0; j < result.length; j++) {
					temp[j] = QrCode.reedSolomonMultiply(result[j], QrCode.reedSolomonExp(i));
					if (j > 0) temp[j] ^= result[j - 1];
				}
				temp[result.length] = result[result.length - 1];
				result = temp;
			}
			return result;
		}

		static reedSolomonMultiply(x, y) {
			if (x == 0 || y == 0) return 0;
			let z = QrCode.reedSolomonLog(x) + QrCode.reedSolomonLog(y);
			return QrCode.reedSolomonExp(z % 255);
		}

		static reedSolomonExp(x) {
			let result = 1;
			for (let i = 0; i < x; i++)
				result = (result << 1) ^ ((result >>> 7) * 0x11D);
			return result;
		}

		static reedSolomonLog(x) {
			if (x == 0) throw "Log of zero";
			let result = 0;
			while (x != 1) {
				x = (x << 1) ^ ((x >>> 7) * 0x11D);
				result++;
			}
			return result;
		}

		static encodeSegments(segs, ecl) {
			let result = [];
			result.push(...QrCode.encodeHeader(segs[0].mode, segs[0].numChars));
			result.push(...segs[0].getData());
			return result;
		}

		static encodeHeader(mode, numChars) {
			let result = [];
			result.push(mode.modeBits);
			let numBits = mode.numCharCountBits(Math.floor(this.version / 10));
			for (let i = numBits - 1; i >= 0; i--) {
				result.push((numChars >>> i) & 1);
			}
			return result;
		}

	});

	QrCode.Ecc = {
		LOW: { ordinal: 0, formatBits: 1 },
		MEDIUM: { ordinal: 1, formatBits: 0 },
		QUARTILE: { ordinal: 2, formatBits: 3 },
		HIGH: { ordinal: 3, formatBits: 2 },
	};

	QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
		[-1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[-1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[-1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
		[-1, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
	];

	QrCode.ECC_CODEWORDS_PER_BLOCK = [
		[-1, 7, 10, 13, 17, 20, 24, 28, 34, 40, 48, 55, 62, 70, 80, 90, 100, 112, 124, 136, 150, 162, 176, 194, 210, 224, 240, 256, 272, 292, 310, 331, 355, 378, 403, 432, 461, 482, 504, 535, 560],
		[-1, 10, 16, 22, 28, 36, 42, 50, 60, 72, 80, 96, 104, 120, 132, 144, 168, 180, 196, 224, 240, 270, 300, 320, 350, 384, 406, 432, 480, 504, 540, 576, 624, 640, 672, 720, 750, 780, 812, 868, 900],
		[-1, 13, 22, 30, 40, 50, 60, 72, 84, 99, 115, 128, 144, 168, 180, 203, 224, 252, 270, 300, 330, 360, 390, 420, 450, 480, 540, 570, 600, 630, 660, 720, 750, 780, 840, 900, 930, 990, 1020, 1050, 1110],
		[-1, 17, 28, 42, 56, 70, 84, 100, 120, 140, 160, 180, 208, 240, 260, 288, 320, 360, 408, 448, 480, 528, 560, 600, 640, 688, 720, 784, 840, 896, 952, 1008, 1050, 1120, 1190, 1260, 1330, 1400, 1470, 1540, 1610],
	];

	const QrSegment = (function() {

		function QrSegment(mode, numChars, bitData) {
			this.mode = mode;
			this.numChars = numChars;
			this.bitData = bitData;
		}

		static makeBytes(data) {
			let bb = [];
			for (let i = 0; i < data.length; i++)
				bb.push(data.charCodeAt(i));
			return new QrSegment(QrSegment.Mode.BYTE, data.length, bb);
		}

		getData() {
			return this.bitData.slice();
		}

	});

	QrSegment.Mode = {
		NUMERIC: { modeBits: 1, numCharCountBits: (v) => [10, 12, 14][v] },
		ALPHANUMERIC: { modeBits: 2, numCharCountBits: (v) => [9, 11, 13][v] },
		BYTE: { modeBits: 4, numCharCountBits: (v) => [8, 16, 16][v] },
		KANJI: { modeBits: 8, numCharCountBits: (v) => [8, 10, 12][v] },
		ECI: { modeBits: 7, numCharCountBits: (v) => 0 },
	};

	return { QrCode, QrSegment };
})();

// App-specific code below

function generateQRCode(text) {
    const ecl = qrcodegen.QrCode.Ecc.LOW;
    const segs = [qrcodegen.QrSegment.makeBytes(text)];
    const qr = qrcodegen.QrCode.encodeSegments(segs, ecl, 1, 40, -1, true);
    const canvas = document.createElement('canvas');
    const scale = 4;
    canvas.width = qr.size * scale;
    canvas.height = qr.size * scale;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            ctx.fillStyle = qr.getModule(x, y) ? '#000000' : '#FFFFFF';
            ctx.fillRect(x * scale, y * scale, scale, scale);
        }
    }
    return canvas;
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