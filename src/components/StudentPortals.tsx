
import { Upload, FileText } from 'lucide-react';
import { ShareableLinkCard } from './ShareableLinkCard';
import { APP_URLS, APP_CONFIG, MESSAGES } from '@/config/constants';

export function StudentPortals() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Portals</h2>
        <p className="text-gray-600">
          Share these links with your students for easy access to upload tests and take quizzes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShareableLinkCard
          title={APP_CONFIG.STUDENT_PORTAL_NAME}
          description={MESSAGES.STUDENT_UPLOAD_DESCRIPTION}
          url={APP_URLS.STUDENT_UPLOAD_URL}
          icon={<Upload className="h-5 w-5" />}
        />
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Create Custom Quiz Links
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              For specific quizzes or tests, create custom links with time limits and attempt restrictions.
            </p>
            <a 
              href={APP_URLS.INTERNAL_ROUTES.CREATE_QUIZ_LINK}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Create Quiz Link →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
