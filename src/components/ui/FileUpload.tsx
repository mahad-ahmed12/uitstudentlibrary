
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [titleError, setTitleError] = useState("");
  const { toast } = useToast();

  const checkForDuplicateTitle = async (titleToCheck: string) => {
    const { data, error } = await supabase
      .from("shared_files")
      .select("id")
      .eq("title", titleToCheck)
      .limit(1);
    
    if (error) {
      console.error("Error checking for duplicate title:", error);
      return false;
    }
    
    return data && data.length > 0;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !secretCode) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a file.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate title
    setTitleError("");
    const isDuplicate = await checkForDuplicateTitle(title);
    if (isDuplicate) {
      setTitleError("A file with this title already exists. Please use a different title.");
      toast({
        title: "Duplicate title",
        description: "A file with this title already exists. Please use a different title.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("shared_files").insert({
        title,
        filename: file.name,
        file_path: filePath,
        secret_code: secretCode,
        content_type: file.type,
        size: file.size,
      });

      if (dbError) throw dbError;

      toast({
        title: "Success!",
        description: "Your file has been uploaded.",
      });

      setFile(null);
      setTitle("");
      setSecretCode("");
      setTitleError("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleError("");
          }}
          placeholder="Enter a title for your file"
          className={titleError ? "border-red-500" : ""}
          required
        />
        {titleError && (
          <p className="text-sm text-red-500 mt-1">{titleError}</p>
        )}
      </div>
      <div>
        <Label htmlFor="secretCode">Secret Code</Label>
        <Input
          id="secretCode"
          value={secretCode}
          onChange={(e) => setSecretCode(e.target.value)}
          placeholder="Enter a secret code"
          required
        />
      </div>
      <div>
        <Label htmlFor="file">File</Label>
        <Input
          id="file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
      </div>
      <Button type="submit" disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload File"}
      </Button>
    </form>
  );
}
