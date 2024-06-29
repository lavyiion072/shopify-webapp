import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Layout,
  Page,
  TextField,
  Button,
  Label,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Form, json } from "@remix-run/react";
import { ActionFunction, LoaderFunction } from "@remix-run/node";
import { connectToDatabase } from "../db/db";
import Base64UploadAdapter from "@ckeditor/ckeditor5-upload/src/adapters/base64uploadadapter";

// Define action function for form submission
export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email") || "";
    const subject = formData.get("subject") || "";
    const template = formData.get("template") || "";

    console.log("email ---> ", email);
    console.log("subject ---> ", subject);
    console.log("template ---> ", template);

    const db = await connectToDatabase();
    const collection = db.collection("emailConfigurations");

    // Example of MongoDB insertion
    const result = await collection.insertOne({
      email,
      subject,
      template,
      createdAt: new Date(),
    });
    console.log("Inserted document id:", result.insertedId);

    return json({ email, subject, template });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: "Failed to save data" }, { status: 500 });
  }
};

// Define loader function
export const loader: LoaderFunction = async () => {
  return json({});
};

const EmailConfigurationPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [template, setTemplate] = useState<string>("");
  const [CKEditor, setCKEditor] = useState<any>(null);
  const [ClassicEditor, setClassicEditor] = useState<any>(null);

  useEffect(() => {
    // Dynamically import CKEditor on the client side
    if (typeof window !== "undefined") {
      import("@ckeditor/ckeditor5-react").then((module) => {
        setCKEditor(() => module.CKEditor);
      });
      import("@ckeditor/ckeditor5-build-classic").then((module) => {
        setClassicEditor(() => module.default);
      });
    }
  }, []);

  // Event handlers for form inputs
  const handleEmailChange = (value: string) => setEmail(value);
  const handleSubjectChange = (value: string) => setSubject(value);
  const handleTemplateChange = (event: any, editor: any) => {
    const data = editor.getData();
    console.log("CKEditor data:", data);
    setTemplate(data);
  };

  // CKEditor configuration for image upload using Base64UploadAdapter
  // const editorConfig = {
  //   extraPlugins: [Base64UploadAdapter],
  // };

  return (
    <Page>
      <TitleBar title="Email Configuration Page" />
      <img
        src="https://yiion.com/themes/mono/assets/images/purple_png.png"
        alt="Logo"
        style={{ maxHeight: "40px", marginBottom: "20px" }}
      />
      <Layout>
        <Layout.Section>
          <Card>
            <Form method="post">
              <Box>
                <TextField
                  label="Email"
                  name="email"
                  value={email}
                  onChange={(value) => handleEmailChange(value)}
                  autoComplete="off"
                />
                <br/>
                <TextField
                  label="Subject"
                  name="subject"
                  value={subject}
                  onChange={(value) => handleSubjectChange(value)}
                  autoComplete="off"
                />
                <br/>
                <Label id={"Template"}>Template</Label>
                {CKEditor && ClassicEditor ? (
                  <>
                    <CKEditor
                      editor={ClassicEditor}
                      data={template}
                      // config={editorConfig}
                      onChange={handleTemplateChange}
                    />
                    <input
                      type="hidden"
                      name="template"
                      value={template}
                    />
                  </>
                ) : (
                  <div>Loading editor...</div>
                )}
                <br />
                <Button submit>Submit</Button>
              </Box>
            </Form>
            <br/>
            <p>Please create variables like below</p>
            <ul>
              <li><b>[CustomerName]</b> - for customer name</li>
              <li><b>[OrderId]</b> - for order Id</li>
              <li><b>[CustomText]</b> - for customText</li>
            </ul>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default EmailConfigurationPage;
