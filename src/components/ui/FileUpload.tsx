
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileIcon, FolderIcon, AlertTriangleIcon } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Add TypeScript declaration for the webkitdirectory property
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: boolean;
  }
}

// Maximum number of files to process in a single batch
const MAX_BATCH_SIZE = 100;
// Maximum upload time before showing warning (in milliseconds)
const UPLOAD_TIMEOUT_WARNING = 30000; // 30 seconds

export function FileUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [title, setTitle] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFolder, setIsFolder] = useState(false);
  const [showLargeUploadWarning, setShowLargeUploadWarning] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setFileCount(filesArray.length);
      
      // Calculate total size
      const size = filesArray.reduce((total, file) => total + file.size, 0);
      setTotalSize(size);
      
      // Show warning if too many files or too large
      if (filesArray.length > 1000 || size > 2 * 1024 * 1024 * 1024) { // 2GB warning
        setShowLargeUploadWarning(true);
      }
      
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
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

    // Create a timeout warning
    const timeoutWarning = setTimeout(() => {
      toast({
        title: "Upload in progress",
        description: "Large uploads may take several minutes. Please be patient.",
        duration: 10000,
      });
    }, UPLOAD_TIMEOUT_WARNING);

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
        
        // Process files in batches to avoid overwhelming the browser
        const filesArray = Array.from(files);
        
        // Process in batches
        for (let i = 0; i < filesArray.length; i += MAX_BATCH_SIZE) {
          const batch = filesArray.slice(i, i + MAX_BATCH_SIZE);
          
          // Process each batch in parallel
          await Promise.all(batch.map(async (file) => {
            try {
              const relativePath = (file as any).webkitRelativePath;
              const filePath = `folders/${folderId}/${relativePath}`;
              
              // Upload the file to Supabase storage
              const { error: uploadError } = await supabase.storage
                .from("files")
                .upload(filePath, file, {
                  contentType: file.type,
                  upsert: true
                });

              if (uploadError) {
                console.error(`Error uploading ${filePath}:`, uploadError);
                // Continue with other files even if one fails
              }
            } catch (error) {
              console.error("Error processing file:", error);
              // Continue with other files
            }
            
            // Update progress
            filesProcessed++;
            setUploadProgress(Math.round((filesProcessed / totalFiles) * 100));
          }));
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
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true
          });

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
      setFileCount(0);
      setTotalSize(0);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload. Please try again with smaller files or folders.",
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutWarning);
      setIsUploading(false);
    }
  };

  return (
    <>
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
                    fileInput.webkitdirectory = false;
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
                    fileInput.webkitdirectory = true;
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
            webkitdirectory={isFolder}
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
                <p className="text-sm text-gray-500">{fileCount} files selected</p>
                <p className="text-sm text-gray-500">Total size: {formatFileSize(totalSize)}</p>
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

      <AlertDialog open={showLargeUploadWarning} onOpenChange={setShowLargeUploadWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
              Large Upload Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're attempting to upload {fileCount} files ({formatFileSize(totalSize)}). 
              Very large uploads may take a long time and could fail. 
              Consider breaking this into smaller uploads or using a compressed format.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel Upload</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowLargeUploadWarning(false)}>
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
