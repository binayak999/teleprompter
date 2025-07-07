import { v4 as uuidv4 } from 'uuid';

// Generate a unique user ID
export const generateUserId = (): string => {
  return uuidv4();
};

// Get or create a user ID from session/cookie
export const getUserId = (req: any): string => {
  console.log('Session:', req.session);
  console.log('Cookies:', req.cookies);
  
  // Check if user ID exists in session
  if (req.session && req.session.userId) {
    console.log('Found userId in session:', req.session.userId);
    return req.session.userId;
  }

  // Check if user ID exists in cookies
  if (req.cookies && req.cookies.userId) {
    console.log('Found userId in cookies:', req.cookies.userId);
    // Also store in session for future requests
    if (req.session) {
      req.session.userId = req.cookies.userId;
    }
    return req.cookies.userId;
  }

  // Generate new user ID
  const userId = generateUserId();
  console.log('Generated new userId:', userId);
  
  // Store in session
  if (req.session) {
    req.session.userId = userId;
    console.log('Stored userId in session');
  }

  return userId;
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