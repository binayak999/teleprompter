import { v4 as uuidv4 } from 'uuid';

// Generate a unique user ID
export const generateUserId = (): string => {
  return uuidv4();
};

// Get user ID from X-User-ID header
export const getUserId = (req: any): string => {
  const userId = req.headers['x-user-id'];
  
  if (userId) {
    console.log('Found userId in header:', userId);
    return userId;
  }

  // Fallback: generate new user ID if header is missing
  const newUserId = generateUserId();
  console.log('No userId in header, generated new userId:', newUserId);
  return newUserId;
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration for display
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}; 