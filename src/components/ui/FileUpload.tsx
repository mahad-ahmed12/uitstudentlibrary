
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "./checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const { toast } = useToast();

  const VERIFICATION_CODE = "01t999";

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

  const handleVerificationSubmit = () => {
    if (verificationCode === VERIFICATION_CODE) {
      setIsVerified(true);
      setVerificationDialogOpen(false);
      setVerificationError("");
      toast({
        title: "Verification successful",
        description: "Your account has been verified.",
      });
    } else {
      setVerificationError("Invalid verification code. Please try again.");
    }
  };

  const handleVerifiedChange = (checked: boolean) => {
    if (checked && !isVerified) {
      setVerificationDialogOpen(true);
    } else {
      setIsVerified(checked);
    }
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
        is_verified: isVerified,
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
    <>
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
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="verified" 
            checked={isVerified} 
            onCheckedChange={handleVerifiedChange}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="verified"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Verified Badge
            </label>
            <p className="text-xs text-muted-foreground">
              This badge is optional and only available for verified personals
            </p>
          </div>
        </div>
        <Button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload File"}
        </Button>
      </form>

      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verification Required</DialogTitle>
            <DialogDescription>
              Please enter the verification code to use the verified badge feature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="password"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  setVerificationError("");
                }}
                placeholder="Enter verification code"
              />
              {verificationError && (
                <p className="text-sm text-red-500">{verificationError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setVerificationDialogOpen(false);
              setIsVerified(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleVerificationSubmit}>Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
