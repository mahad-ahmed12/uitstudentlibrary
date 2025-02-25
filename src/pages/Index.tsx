
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/FileUpload";
import { FileList } from "@/components/ui/FileList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define types for our website texts
type WebsiteText = {
  id: string;
  content: string;
};

const Index = () => {
  const [texts, setTexts] = useState({
    text1: "Loading...",
    text2: "Loading..."
  });
  const [isEditing, setIsEditing] = useState<'text1' | 'text2' | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [newText, setNewText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadTexts();
  }, []);

  const loadTexts = async () => {
    // Use type assertion for the database query
    const { data, error } = await (supabase
      .from('website_texts')
      .select('id, content') as unknown as Promise<{ 
        data: WebsiteText[] | null; 
        error: any; 
      }>);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load texts",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      const textsMap = data.reduce((acc, item) => ({
        ...acc,
        [item.id]: item.content
      }), {});

      setTexts(textsMap as { text1: string; text2: string });
    }
  };

  const handleEdit = (textKey: 'text1' | 'text2') => {
    setIsEditing(textKey);
    setNewText(texts[textKey]);
    setEditPassword("");
  };

  const handleSave = async () => {
    if (editPassword !== "41134") {
      toast({
        title: "Error",
        description: "Incorrect password",
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      // Use type assertion for the update query
      const { error } = await (supabase
        .from('website_texts')
        .update({ content: newText })
        .eq('id', isEditing) as unknown as Promise<{ 
          data: null; 
          error: any; 
        }>);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update text",
          variant: "destructive",
        });
        return;
      }

      setTexts(prev => ({
        ...prev,
        [isEditing]: newText
      }));
      setIsEditing(null);
      setEditPassword("");
      setNewText("");
      toast({
        title: "Success",
        description: "Text updated successfully",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Uit Student Library
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Upload and share files securely with secret codes
          </p>
          <div className="space-y-4">
            <div className="relative">
              <p className="text-lg bg-green-100/50 p-4 rounded-lg">
                {texts.text1}
              </p>
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleEdit('text1')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <p className="text-lg bg-green-100/50 p-4 rounded-lg">
                {texts.text2}
              </p>
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleEdit('text2')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <FileList />
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-gray-500 mt-8">
          By proceeding, you acknowledge that the submitted content may be reviewed and utilized as part of the platform's
        </div>
      </div>

      <Dialog open={isEditing !== null} onOpenChange={() => setIsEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Text</DialogTitle>
            <DialogDescription>
              Enter the admin password to make changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter new text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="mb-2"
            />
            <Input
              type="password"
              placeholder="Enter admin password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
