import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useParams, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import mongoose from "mongoose";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// Establish MongoDB connection
// const mongoURL = "mongodb+srv://ketulpyiion:VacTgUGpDL0tOF0n@cluster1.fczmijy.mongodb.net/Test?retryWrites=true&w=majority&appName=Cluster1";

// mongoose.connect(mongoURL)
//   .then(() => {
//     console.log("Connected to MongoDB");
//   }).catch((error) => {
//     console.error("Error connecting to MongoDB:", error);
//   });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  // const mongoURL = "mongodb+srv://ketulpyiion:VacTgUGpDL0tOF0n@cluster1.fczmijy.mongodb.net/Test?retryWrites=true&w=majority&appName=Cluster1";

  //  mongoose.connect(mongoURL)


  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Home</Link>
        <Link to="/app/email">Email Configuration Page</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// const IndexPage = () => {
//   const {orderId} = useParams();
// }
// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
