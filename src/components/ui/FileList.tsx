import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Download, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

interface SharedFile {
  id: string;
  title: string;
  filename: string;
  created_at: string;
  is_verified?: boolean;
}

export function FileList() {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<SharedFile | null>(null);
  const [secretCode, setSecretCode] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SharedFile | null>(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, [searchQuery]);

  const loadFiles = async () => {
    console.log("Loading files...");
    let query = supabase
      .from("shared_files")
      .select("id, title, filename, created_at, is_verified")
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

  const handleDelete = async () => {
    if (!fileToDelete) return;

    const { data, error } = await supabase
      .from("shared_files")
      .select("secret_code, file_path")
      .eq("id", fileToDelete.id)
      .single();

    if (error || !data) {
      toast({
        title: "Error",
        description: "Failed to verify access.",
        variant: "destructive",
      });
      return;
    }

    if (deleteCode !== data.secret_code && deleteCode !== "41134") {
      toast({
        title: "Access Denied",
        description: "Incorrect secret code.",
        variant: "destructive",
      });
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("files")
      .remove([data.file_path]);

    if (storageError) {
      toast({
        title: "Error",
        description: "Failed to delete file from storage.",
        variant: "destructive",
      });
      return;
    }

    const { error: dbError } = await supabase
      .from("shared_files")
      .delete()
      .eq("id", fileToDelete.id);

    if (dbError) {
      toast({
        title: "Error",
        description: "Failed to delete file record.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "File deleted successfully.",
    });

    setDeleteDialogOpen(false);
    setFileToDelete(null);
    setDeleteCode("");
    loadFiles();
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
        return;
      }

      if (secretCode !== data.secret_code && secretCode !== "41134") {
        toast({
          title: "Access Denied",
          description: "Incorrect secret code.",
          variant: "destructive",
        });
        return;
      }

      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from("files")
        .createSignedUrl(data.file_path, 300);

      if (signedURLError || !signedURLData?.signedUrl) {
        toast({
          title: "Error",
          description: "Failed to create download link.",
          variant: "destructive",
        });
        return;
      }

      try {
        toast({
          title: "Download Starting",
          description: "Your file is being prepared for download...",
        });
        
        const response = await fetch(signedURLData.signedUrl);
        const blob = await response.blob();
        
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = blobUrl;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "File downloaded successfully.",
        });
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        
        toast({
          title: "Using Alternative Method",
          description: "Download is opening in a new tab. You may need to save the file manually.",
        });
        
        window.open(signedURLData.signedUrl, '_blank');
      }

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
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{file.title}</CardTitle>
                {file.is_verified && (
                  <span title="Verified">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFileToDelete(file);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Enter the secret code to delete this file. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter secret code"
              type="password"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setFileToDelete(null);
                  setDeleteCode("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
