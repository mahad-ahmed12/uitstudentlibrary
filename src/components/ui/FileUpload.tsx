
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileIcon, FolderIcon } from "lucide-react";

// Add TypeScript declaration for the webkitdirectory property
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
  }
}

export function FileUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [title, setTitle] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFolder, setIsFolder] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      // Auto-populate title with folder name if it's a folder upload
      if (e.target.webkitdirectory && e.target.files.length > 0) {
        const firstFile = e.target.files[0];
        const folderPath = firstFile.webkitRelativePath;
        const folderName = folderPath.split('/')[0];
        setTitle(folderName);
        setIsFolder(true);
      } else {
        setIsFolder(false);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0 || !title || !secretCode) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select file(s).",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (isFolder) {
        // Folder upload - we'll upload each file while maintaining folder structure
        const totalFiles = files.length;
        let filesProcessed = 0;
        
        // Create a single database entry for the entire folder
        const folderId = crypto.randomUUID();
        
        // Store metadata about the folder
        const { error: folderDbError } = await supabase.from("shared_files").insert({
          id: folderId,
          title,
          filename: title,
          file_path: `folders/${folderId}`,
          secret_code: secretCode,
          content_type: "folder",
          size: Array.from(files).reduce((total, file) => total + file.size, 0),
          is_folder: true,
          file_count: files.length
        });
        
        if (folderDbError) {
          console.error("Error saving folder metadata:", folderDbError);
          throw folderDbError;
        }
        
        // Now upload all files to storage with paths that preserve folder structure
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const relativePath = (file as any).webkitRelativePath;
          
          // Create path that preserves folder structure under the folder ID
          const filePath = `folders/${folderId}/${relativePath}`;
          
          // Upload the file to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from("files")
            .upload(filePath, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            console.error(`Error uploading ${filePath}:`, uploadError);
            // Continue with other files even if one fails
          }
          
          // Update progress
          filesProcessed++;
          setUploadProgress(Math.round((filesProcessed / totalFiles) * 100));
        }
        
        toast({
          title: "Success!",
          description: `Folder '${title}' with ${totalFiles} files has been uploaded.`,
        });
      } else {
        // Single file upload - use existing logic
        const file = files[0];
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
          is_folder: false,
        });

        if (dbError) throw dbError;

        toast({
          title: "Success!",
          description: "Your file has been uploaded.",
        });
      }

      setFiles(null);
      setTitle("");
      setSecretCode("");
      setUploadProgress(0);
      setIsFolder(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload. Please try again.",
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
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for your file/folder"
          required
        />
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
      <div className="space-y-2">
        <Label>Upload Type</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Button
              type="button"
              variant={!isFolder ? "default" : "outline"}
              className="w-full justify-center items-center gap-2"
              onClick={() => {
                setIsFolder(false);
                const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                if (fileInput) {
                  fileInput.webkitdirectory = "";
                  fileInput.multiple = false;
                  fileInput.click();
                }
              }}
            >
              <FileIcon className="w-4 h-4" /> Single File
            </Button>
          </div>
          <div className="flex-1">
            <Button
              type="button"
              variant={isFolder ? "default" : "outline"}
              className="w-full justify-center items-center gap-2"
              onClick={() => {
                setIsFolder(true);
                const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                if (fileInput) {
                  fileInput.webkitdirectory = "";
                  fileInput.multiple = true;
                  fileInput.click();
                }
              }}
            >
              <FolderIcon className="w-4 h-4" /> Folder
            </Button>
          </div>
        </div>
      </div>
      <div className="hidden">
        <Input
          id="fileInput"
          type="file"
          webkitdirectory={isFolder ? "" : undefined}
          multiple={isFolder}
          onChange={handleFileChange}
          required
        />
      </div>
      {files && files.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-md">
          {isFolder ? (
            <div>
              <p className="font-medium">Folder: {title}</p>
              <p className="text-sm text-gray-500">{files.length} files selected</p>
            </div>
          ) : (
            <p className="font-medium">File: {files[0].name}</p>
          )}
        </div>
      )}
      {isUploading && uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <p className="text-xs text-gray-500 mt-1 text-center">{uploadProgress}% complete</p>
        </div>
      )}
      <Button type="submit" disabled={isUploading} className="w-full">
        {isUploading ? 
          (isFolder ? `Uploading folder (${uploadProgress}%)...` : "Uploading...") 
          : 
          (isFolder ? "Upload Folder" : "Upload File")
        }
      </Button>
    </form>
  );
}
