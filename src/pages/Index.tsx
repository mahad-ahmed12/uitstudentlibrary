
import { useState } from "react";
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

const Index = () => {
  const [texts, setTexts] = useState({
    text1: "This has been created because of the students which were concerned on the group how they will access files in the lab",
    text2: "This has been created by a secret team in uit university this is a great example that if you will vote our cr which we will soon be announce by us, we will be providing you with this type of helpful solutions"
  });
  const [isEditing, setIsEditing] = useState<'text1' | 'text2' | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [newText, setNewText] = useState("");
  const { toast } = useToast();

  const handleEdit = (textKey: 'text1' | 'text2') => {
    setIsEditing(textKey);
    setNewText(texts[textKey]);
    setEditPassword("");
  };

  const handleSave = () => {
    if (editPassword !== "41134") {
      toast({
        title: "Error",
        description: "Incorrect password",
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
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
