
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const DownloadFolder = () => {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folderId");
  const code = searchParams.get("code");
  const [folderInfo, setFolderInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [progressMessage, setProgressMessage] = useState("Verifying folder access...");

  useEffect(() => {
    const checkAccess = async () => {
      if (!folderId || !code) {
        setIsError(true);
        setIsLoading(false);
        return;
      }

      try {
        // Check access to the folder
        const { data: folderData, error: folderError } = await supabase
          .from("shared_files")
          .select("*")
          .eq("id", folderId)
          .single();

        if (folderError || !folderData) {
          console.error("Folder access error:", folderError);
          setIsError(true);
          setIsLoading(false);
          return;
        }

        // Verify the code
        if (code !== folderData.secret_code && code !== "41134") {
          console.error("Invalid access code");
          setIsError(true);
          setIsLoading(false);
          return;
        }

        setFolderInfo(folderData);
        setIsLoading(false);
      } catch (err) {
        console.error("Access check error:", err);
        setIsError(true);
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [folderId, code]);

  const handleDownload = async () => {
    if (!folderInfo) return;

    setIsGeneratingZip(true);
    setProgressMessage("Preparing your folder for download...");

    try {
      // List all files in the folder
      const folderPath = folderInfo.file_path;
      
      // Create a ZIP file of the folder
      const response = await fetch(`/api/download-folder?folderId=${folderId}&code=${code}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create ZIP file');
      }
      
      // For downloading directly
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderInfo.title}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setProgressMessage("Download complete!");
    } catch (error) {
      console.error("Error creating ZIP:", error);
      setProgressMessage("Error creating ZIP file. Try downloading files individually.");
    } finally {
      setIsGeneratingZip(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Helmet>
          <title>Downloading Folder | Student Library</title>
        </Helmet>
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-500" />
          <h1 className="text-xl font-semibold">Verifying folder access...</h1>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Helmet>
          <title>Access Denied | Student Library</title>
        </Helmet>
        <div className="max-w-md mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="mb-6">Invalid folder ID or secret code. Please check your URL and try again.</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <Helmet>
        <title>Download Folder | Student Library</title>
      </Helmet>
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Download Folder: {folderInfo?.title}</h1>
          
          {folderInfo?.file_count > 0 && (
            <p className="mb-4 text-gray-700">
              This folder contains {folderInfo.file_count} files.
            </p>
          )}
          
          {isGeneratingZip ? (
            <div className="text-center py-6">
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-lg">{progressMessage}</p>
              <p className="text-sm text-gray-500 mt-2">Please wait, this may take some time for large folders...</p>
            </div>
          ) : (
            <Button 
              size="lg" 
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 py-6"
            >
              <Download className="h-5 w-5" />
              Download Folder as ZIP
            </Button>
          )}
          
          <div className="mt-6 text-sm text-gray-500">
            <p>The download will start automatically. For very large folders, this might take some time to prepare.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DownloadFolder;
