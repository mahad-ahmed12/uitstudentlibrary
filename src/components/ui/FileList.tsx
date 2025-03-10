
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

interface SharedFile {
  id: string;
  title: string;
  filename: string;
  created_at: string;
}

export function FileList() {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<SharedFile | null>(null);
  const [secretCode, setSecretCode] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, [searchQuery]);

  const loadFiles = async () => {
    console.log("Loading files...");
    let query = supabase
      .from("shared_files")
      .select("id, title, filename, created_at")
      .order("created_at", { ascending: false });

    if (searchQuery) {
      query = query.ilike("title", `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load files.",
        variant: "destructive",
      });
      console.error("Error loading files:", error);
      return;
    }

    console.log("Files loaded:", data);
    setFiles(data || []);
  };

  const downloadFile = async (file: SharedFile) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      const { data, error } = await supabase
        .from("shared_files")
        .select("secret_code, file_path")
        .eq("id", file.id)
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Failed to verify access.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      // Check for root access code or the file-specific code
      if (secretCode !== data.secret_code && secretCode !== "41134") {
        toast({
          title: "Access Denied",
          description: "Incorrect secret code.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      // Get signed URL
      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from("files")
        .createSignedUrl(data.file_path, 300); // 5 minutes expiry
      
      if (signedURLError || !signedURLData?.signedUrl) {
        toast({
          title: "Error",
          description: "Failed to create download link.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }
      
      // Force download using iframe technique (works better cross-browser)
      const downloadFrame = document.createElement('iframe');
      downloadFrame.style.display = 'none';
      document.body.appendChild(downloadFrame);
      
      // Add download attributes to make it work
      downloadFrame.onload = function() {
        // This triggers after iframe loads - clean up
        setTimeout(() => {
          document.body.removeChild(downloadFrame);
        }, 2000); // Give it time to process
      };
      
      // Set the src with download attributes
      downloadFrame.src = signedURLData.signedUrl;
      
      // Also try the anchor approach as a backup
      const downloadLink = document.createElement('a');
      downloadLink.href = signedURLData.signedUrl;
      downloadLink.download = file.filename;
      downloadLink.target = '_blank';
      downloadLink.rel = 'noopener noreferrer';
      downloadLink.setAttribute('download', file.filename);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Clean up the anchor
      setTimeout(() => {
        document.body.removeChild(downloadLink);
      }, 100);
      
      toast({
        title: "Download Started",
        description: "Your file download has started. If it doesn't download automatically, check your browser download settings.",
      });
      
      setSelectedFile(null);
      setSecretCode("");
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred during download.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search files by title..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <Card key={file.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-lg">{file.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {file.filename}
              </p>
              {selectedFile?.id === file.id ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter secret code"
                    type="password"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => downloadFile(file)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? "Preparing..." : "Download"}
                      {!isDownloading && <Download className="ml-2 h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setSecretCode("");
                      }}
                      disabled={isDownloading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setSelectedFile(file)}>Access File</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
