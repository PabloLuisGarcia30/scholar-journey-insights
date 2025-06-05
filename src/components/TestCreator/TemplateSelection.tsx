
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  defaultQuestions: Partial<any>[];
}

interface TemplateSelectionProps {
  templates: TestTemplate[];
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

export const TemplateSelection = ({ templates, selectedTemplate, onTemplateSelect }: TemplateSelectionProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h2>
        <p className="text-gray-600">Select a template to get started quickly</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onTemplateSelect(template.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <FileText className="h-5 w-5" />
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{template.description}</p>
              <p className="text-sm text-blue-600 mt-2">
                {template.defaultQuestions.length} default questions
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
