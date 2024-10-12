import { v2 as cloudinary } from 'cloudinary';
import { fetchImageAsBase64 } from './fetchImageAsBase64';

export const decodeBase64 = async (base64String: string | undefined, filename: string): Promise<string> => {
  try {
    if (!base64String) {
      return '';
    }
    if (base64String.startsWith('http')) {
      base64String = await fetchImageAsBase64(base64String);
    }
    const mimeType = base64String.split(';')[0].split(':')[1];
    const base64Data = base64String.split(',')[1];
    if (!base64Data) {
     return '';
    }
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: 'image', public_id: filename }, (error, result) => {
        if (error) {
          reject(new Error('Cloudinary upload error: ' + error.message));
        } else {
          resolve(result);
        }
      }).end(buffer);
    });
    return result.secure_url;
  } catch (error: any) {
    return '';
  }
};