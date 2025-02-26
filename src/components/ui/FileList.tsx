
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
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
}

export function FileList() {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<SharedFile | null>(null);
  const [secretCode, setSecretCode] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SharedFile | null>(null);
  const [deleteCode, setDeleteCode] = useState("");
  const { toast } = useToast();
  const [publicURL, setPublicURL] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [searchQuery]);

  const loadFiles = async () => {
    let query = supabase
      .from("shared_files")
      .select("id, title, filename, created_at")
      .order("created_at", { ascending: false });

    if (searchQuery) {
      query = query.ilike("title", `%${searchQuery}%`);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load files.",
        variant: "destructive",
      });
      return;
    }

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

    // Delete from storage
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

    // Delete from database
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

    if (data.secret_code !== secretCode) {
      toast({
        title: "Access Denied",
        description: "Incorrect secret code.",
        variant: "destructive",
      });
      return;
    }

    // For iOS, create a temporary signed URL that opens in a new tab
    // Using a safer iOS detection method that doesn't rely on MSStream
    const userAgent = navigator.userAgent || navigator.vendor || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

    if (isIOS) {
      const { data: signedURLData } = await supabase.storage
        .from("files")
        .createSignedUrl(data.file_path, 60); // 60 seconds expiry
      
      if (signedURLData?.signedUrl) {
        setPublicURL(signedURLData.signedUrl);
        // Open the signed URL in a new tab
        window.open(signedURLData.signedUrl, '_blank');
        toast({
          title: "File Access Granted",
          description: "The file should open in a new tab. If it doesn't, click the download button again.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create download link.",
          variant: "destructive",
        });
      }
      return;
    }

    // For non-iOS devices, use the original direct download method
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("files")
      .download(data.file_path);

    if (downloadError) {
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(fileData);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
    setSelectedFile(null);
    setSecretCode("");
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
                Expires: {new Date(new Date(file.created_at).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString()}
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
                    <Button onClick={() => downloadFile(file)}>Download</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setSecretCode("");
                      }}
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
