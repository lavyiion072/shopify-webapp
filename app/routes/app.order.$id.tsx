import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  TextField,
  Button,
} from "@shopify/polaris";
import { useLoaderData, useParams, Form } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { ActionFunction, LoaderFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import mongoose from "mongoose";
import { useState } from "react";
import nodemailer from "nodemailer";
import { redirect } from "@remix-run/node";
import path from "path";
import fs from "fs/promises";
import { connectToDatabase } from "~/db/db";

const mongoURL = process.env.MONGO_URL || "";

const orderSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  totalPrice: String,
  lineItems: [
    {
      id: String,
      name: String,
    },
  ],
});

const OrderModel = mongoose.models.Order || mongoose.model("Order", orderSchema);

const orderCommentSchema = new mongoose.Schema({
  id: String,
  comments: String,
  imageURLs: [String],
});

const OrderCommentModel = mongoose.models.OrderComment || mongoose.model("OrderComment", orderCommentSchema);

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  await mongoose.connect(mongoURL).then(() => {
    console.log("Connected to MongoDB");
  }).catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

  const orderId = `gid://shopify/Order/${params.id}`;

  const response = await admin.graphql(
    `#graphql
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        totalPriceSet {
          shopMoney {
            amount
          }
        }
        lineItems(first: 10) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }`,
    { variables: { id: orderId } }
  );

  const data = await response.json();
  const order = data.data.order;

  if (!order) {
    return json({ error: "Order not found" }, { status: 404 });
  }

  const checkAvailOrder = await OrderModel.findOne({ id: order.id.replace('gid://shopify/Order/', '') });
  if (!checkAvailOrder) {
    const orderDoc = new OrderModel({
      id: order.id.replace('gid://shopify/Order/', ''),
      totalPrice: order.totalPriceSet.shopMoney.amount,
      lineItems: order.lineItems.edges.map((item: any) => ({
        id: item.node.id,
        name: item.node.name,
      })),
    });

    try {
      await orderDoc.save();
    } catch (error: any) {
      if (error.code === 11000) {
        console.log("Duplicate key error:", error.message);
      } else {
        console.log("error-->", error);
      }
    }
  }

  let orderComments = await OrderCommentModel.find({ id: order.id.replace('gid://shopify/Order/', '') });
  console.log(orderComments);

  return json({ order, orderComments });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const customText = formData.get("customText") || "";
  const id = formData.get("id");

  if (!id || !customText) {
    return json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await mongoose.connect(mongoURL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    return json({ error: "Failed to connect to MongoDB" }, { status: 500 });
  }

  let imageUrls: string[] = [];
  const files = formData.getAll("images");

  const attachments: { filename: string; path: string }[] = [];

  for (const file of files) {
    if (file instanceof File && file.size > 0) {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = path.join(process.cwd(), "uploads", fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      imageUrls.push(`/uploads/${fileName}`);

      attachments.push({
        filename: fileName,
        path: filePath,
      });
    }
  }

  let orderComment;
  try {
    orderComment = new OrderCommentModel({
      id: id,
      comments: customText,
      imageURLs: imageUrls,
    });

    await orderComment.save();
    console.log("Order updated successfully");
  } catch (error) {
    console.error("Error updating order:", error);
    return json({ error: "Failed to update order" }, { status: 500 });
  }

  const db = await connectToDatabase();
  const collection = db.collection("emailConfigurations");

  let emailConfigurations = await collection.find({}).toArray();
  console.log("data111111-->", emailConfigurations);

  let emailConfiguration = emailConfigurations[0];

  const htmlContent = emailConfiguration.template
                          .replace("[OrderId]", id)
                          .replace("[CustomerName]", "Dixitbhai Patel")
                          .replace("[CustomText]", customText);
  console.log("htmlContent-->", htmlContent);

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  if (attachments.length > 0) {
    await transporter.sendMail({
      from: emailConfiguration.email,
      to: "ketulp.yiion@gmail.com",
      subject: emailConfiguration.subject,
      html: htmlContent,
      attachments: attachments,
    });
  } else {
    await transporter.sendMail({
      from: emailConfiguration.email,
      to: "ketulp.yiion@gmail.com",
      subject: emailConfiguration.subject,
      html: htmlContent,
    });
  }

  return json({ orderComments: orderComment });
};

export default function OrderPage() {
  const { order, orderComments } = useLoaderData<{ order: any; orderComments: any }>();
  const params = useParams();
  const [customText, setCustomText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleCustomTextChange = (value: string) => {
    setCustomText(value);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  return (
    <Page>
      <TitleBar title="Order Details Page" />
      <img
        src="https://yiion.com/themes/mono/assets/images/purple_png.png"
        alt="Logo"
        style={{ maxHeight: "40px", marginBottom: "20px" }}
      />
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingLg" as="h1">
              Order Details
            </Text>
            <Text variant="bodyMd" as="p">
              Order ID: {params.id}
            </Text>
            <Text variant="bodyMd" as="p">
              Total Price: {order.totalPriceSet.shopMoney.amount}
            </Text>
            <Text variant="bodyMd" as="p">
              Line Items:
            </Text>
            <List>
              {order.lineItems.edges.map((item: any) => (
                <List.Item key={item.node.id}>{item.node.name}</List.Item>
              ))}
            </List>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Form method="post" encType="multipart/form-data">
              <input type="hidden" name="id" value={params.id} />
              <TextField
                label="Timeline"
                value={customText}
                onChange={handleCustomTextChange}
                autoComplete="off"
                name="customText"
                placeholder="Leave a comment..."
              />
              <br />
              <input type="file" name="images" multiple onChange={handleFileChange} />
              <br />
              <br />
              <Button submit>Send</Button>
            </Form>
          </Card>
        </Layout.Section>

        {orderComments && (
          <Layout.Section>
            <Card>
              <Text variant="headingLg" as="h2">
                Order Comments
              </Text>
              <List type="bullet">
                {orderComments.map((comment: any, index: number) => (
                  <List.Item key={index}>{comment.comments}</List.Item>
                ))}
              </List>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
