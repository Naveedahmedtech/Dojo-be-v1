"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBase64 = void 0;
const cloudinary_1 = require("cloudinary");
const fetchImageAsBase64_1 = require("./fetchImageAsBase64");
const decodeBase64 = (base64String, filename) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!base64String) {
            return '';
        }
        if (base64String.startsWith('http')) {
            base64String = yield (0, fetchImageAsBase64_1.fetchImageAsBase64)(base64String);
        }
        const mimeType = base64String.split(';')[0].split(':')[1];
        const base64Data = base64String.split(',')[1];
        if (!base64Data) {
            return '';
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const result = yield new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader.upload_stream({ resource_type: 'image', public_id: filename }, (error, result) => {
                if (error) {
                    reject(new Error('Cloudinary upload error: ' + error.message));
                }
                else {
                    resolve(result);
                }
            }).end(buffer);
        });
        return result.secure_url;
    }
    catch (error) {
        return '';
    }
});
exports.decodeBase64 = decodeBase64;
