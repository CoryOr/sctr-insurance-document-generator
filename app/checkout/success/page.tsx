// app/checkout/success/page.tsx
import CheckoutSuccessClient from "./checkout-success-client";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const sessionId =
    typeof sp.session_id === "string" ? sp.session_id : null;

  return <CheckoutSuccessClient sessionId={sessionId} />;
}