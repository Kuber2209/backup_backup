
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as getStorage } from '@/lib/firebase';

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The path where the file should be stored (e.g., 'task-documents/').
 * @returns The download URL of the uploaded file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided for upload.");

  const storageRef = ref(getStorage(), `${path}/${Date.now()}_${file.name}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};
