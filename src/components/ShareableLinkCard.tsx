
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MESSAGES } from '@/config/constants';

interface ShareableLinkCardProps {
  title: string;
  description: string;
  url: string;
  icon?: React.ReactNode;
  showQrCode?: boolean;
}

export function ShareableLinkCard({ 
  title, 
  description, 
  url, 
  icon,
  showQrCode = true 
}: ShareableLinkCardProps) {
  const [showQr, setShowQr] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    toast({
      title: MESSAGES.COPY_SUCCESS,
      description: "Students can now access the portal using this link.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-gray-50 rounded border text-sm font-mono break-all">
          {url}
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-1" />
            Copy Link
          </Button>
          
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </a>
          </Button>
          
          {showQrCode && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowQr(!showQr)}
            >
              <QrCode className="h-4 w-4 mr-1" />
              QR Code
            </Button>
          )}
        </div>

        {showQr && (
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="w-32 h-32 bg-gray-200 mx-auto mb-2 flex items-center justify-center text-sm text-gray-500">
              QR Code Placeholder
            </div>
            <p className="text-xs text-gray-600">{MESSAGES.QR_CODE_DESCRIPTION}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
