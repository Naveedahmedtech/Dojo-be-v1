export const convertTimeToMinutes = (timeString: string): number => {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 60 + minutes + seconds / 60;
};
  
  module.exports = {
    convertTimeToMinutes,
  };