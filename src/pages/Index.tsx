
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/FileUpload";
import { FileList } from "@/components/ui/FileList";

const Index = () => {
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
            <p className="text-lg bg-green-100/50 p-4 rounded-lg">
              This has been created because of the students which were concerned on the group how they will access files in the lab
            </p>
            <p className="text-lg bg-green-100/50 p-4 rounded-lg">
              This has been created by a secret team in uit university this is a great example that if you will vote our cr which we will soon be announce by us, we will be providing you with this type of helpful solutions
            </p>
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
    </div>
  );
};

export default Index;
