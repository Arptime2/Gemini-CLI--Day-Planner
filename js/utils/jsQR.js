"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var binarizer_1 = require("./binarizer");
var decoder_1 = require("./decoder");
var locator_1 = require("./locator");
var preprocessor_1 = require("./preprocessor");
function jsQR(data, width, height, options) {
    var _a;
    var inverted = !!(options && options.inversionAttempt);
    var preprocessed = (0, preprocessor_1.preprocess)(data, width, height, inverted);
    var binarized = (0, binarizer_1.binarize)(preprocessed.data, preprocessed.width, preprocessed.height, inverted);
    var location = (0, locator_1.locate)(binarized.binarized);
    if (!location) {
        return null;
    }
    var decoded = (0, decoder_1.decode)(binarized.binarized, location);
    if (decoded) {
        return {
            binaryData: decoded.binaryData,
            data: decoded.data,
            chunks: decoded.chunks,
            version: decoded.version,
            location: {
                topRightCorner: location.topRight,
                topLeftCorner: location.topLeft,
                bottomRightCorner: location.bottomRight,
                bottomLeftCorner: location.bottomLeft,
                topRightFinderPattern: location.topRightFinder,
                topLeftFinderPattern: location.topLeftFinder,
                bottomLeftFinderPattern: location.bottomLeftFinder,
                bottomRightAlignmentPattern: (_a = location.alignmentPattern) === null || _a === void 0 ? void 0 : _a.bottomRight,
            },
        };
    }
    return null;
}
exports.default = jsQR;
