import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query {
      orders(first: 10) {
        edges {
          node {
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
        }
      }
    }`
  );

  const responseJson = await response.json();
  console.log("responseJson1", responseJson.data.orders.edges[0].node.id);

  responseJson.data.orders.edges.map((order: any) => {
    order.node.id = order.node.id.replace("gid://shopify/Order/", "");
  });

  return json({
    orders: responseJson!.data!.orders!
  });
};

const Index = () => {
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  const viewOrders = () => submit({}, { replace: true, method: "POST" });

  return (
    <Page>
      <TitleBar title="Orders Management" />
      <img
        src="https://yiion.com/themes/mono/assets/images/purple_png.png"
        alt="Logo"
        style={{ maxHeight: "40px", marginBottom: "20px" }}
      />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    View Orders and More
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Click the button above to view the latest orders. You can also send comments on a particular order and configure email notifications.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Features:
                  </Text>
                  <List type="bullet">
                    <List.Item>View detailed information of orders</List.Item>
                    <List.Item>Send comments on specific orders and send mail to customer</List.Item>
                    <List.Item>Configure email notifications</List.Item>
                  </List>
                </BlockStack>
                <InlineStack gap="300">
                  <Button loading={isLoading} onClick={viewOrders}>
                    View Orders
                  </Button>
                </InlineStack>
                {actionData?.orders && (
                  <>
                    <Text as="h3" variant="headingMd">
                      Orders
                    </Text>
                    <Box
                      padding="400"
                      background="bg-surface-active"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      overflowX="scroll"
                    >
                      <table
                        style={{
                          borderCollapse: "collapse",
                          width: "100%",
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>ID</th>
                            <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Total Price</th>
                            <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Line Items</th>
                            <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actionData.orders.edges.map((order: { node: { id: string, totalPriceSet: { shopMoney: { amount: string } }, lineItems: { edges: { node: { id: string, name: string } }[] } } }, index: React.Key | null | undefined) => (
                            <tr key={index}>
                              <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{order.node.id}</td>
                              <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{order.node.totalPriceSet.shopMoney.amount}</td>
                              <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                                <ul style={{ margin: "0", padding: "0", listStyleType: "none" }}>
                                  {order.node.lineItems.edges.map(lineItem => (
                                    <li key={lineItem.node.id}>{lineItem.node.name}</li>
                                  ))}
                                </ul>
                              </td>
                              <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                                <Link url={`/app/order/${order.node.id}`}>View</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export default Index;
