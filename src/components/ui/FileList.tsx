
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();

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
            <CardHeader>
              <CardTitle className="text-lg">{file.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {new Date(file.created_at).toLocaleDateString()}
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
                      onClick={() => setSelectedFile(null)}
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
