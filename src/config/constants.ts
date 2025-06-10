
// Application URLs and Configuration
export const APP_URLS = {
  // Student-facing URLs
  STUDENT_UPLOAD_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/student-upload' // Replace with your live domain
    : 'http://localhost:5173/student-upload',
  
  // Internal routes
  INTERNAL_ROUTES: {
    STUDENT_UPLOAD: '/student-upload',
    CREATE_QUIZ_LINK: '/create-quiz-link',
    TEST_CREATOR: '/test-creator',
    UPLOAD_TEST: '/upload-test',
  }
};

export const APP_CONFIG = {
  APP_NAME: 'EduTracker',
  STUDENT_PORTAL_NAME: 'Student Upload Portal',
  QUIZ_PORTAL_NAME: 'Online Quiz Portal',
};

export const MESSAGES = {
  STUDENT_UPLOAD_DESCRIPTION: 'Upload your test papers for automatic grading and feedback',
  QUIZ_DESCRIPTION: 'Take online quizzes and tests assigned by your teacher',
  COPY_SUCCESS: 'Link copied to clipboard!',
  QR_CODE_DESCRIPTION: 'Scan with your phone to access the portal',
};

// Development Configuration
export const DEV_CONFIG = {
  // Set to true to bypass authentication during development
  DISABLE_AUTH_FOR_DEV: true,
  // Default role when auth is disabled (can be 'teacher' or 'student')
  DEFAULT_DEV_ROLE: 'teacher' as const
};
