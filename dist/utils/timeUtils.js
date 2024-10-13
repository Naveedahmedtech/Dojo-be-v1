"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTimeToMinutes = void 0;
const convertTimeToMinutes = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 60 + minutes + seconds / 60;
};
exports.convertTimeToMinutes = convertTimeToMinutes;
module.exports = {
    convertTimeToMinutes: exports.convertTimeToMinutes,
};
