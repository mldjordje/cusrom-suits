import { SITE_URL } from "@/lib/seo";
import { isEmailEnabled, sendEmail } from "@/lib/email/client";
import {
  buildAdminContactEmail,
  buildAdminOrderEmail,
  buildCustomerOrderEmail,
  buildCustomerStatusUpdateEmail,
  buildNewsletterWelcomeEmail,
  type ContactEmailContext,
  type NewsletterWelcomeContext,
  type OrderEmailContext,
  type OrderStatusUpdateContext,
} from "@/lib/email/templates";

const normalize = (value: string | undefined | null) => String(value || "").trim();

const getAdminRecipients = () => {
  const raw = normalize(process.env.ORDER_NOTIFICATION_EMAIL);
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0 && email.includes("@"));
};

const getContactRecipients = () => {
  const raw = normalize(process.env.CONTACT_NOTIFICATION_EMAIL) || normalize(process.env.ORDER_NOTIFICATION_EMAIL);
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0 && email.includes("@"));
};

const adminOrderLink = (orderId: string) => `${SITE_URL}/admin/orders?highlight=${encodeURIComponent(orderId)}`;
const adminContactLink = () => `${SITE_URL}/admin/contact-messages`;

export async function sendOrderNotifications(ctx: OrderEmailContext): Promise<void> {
  if (!isEmailEnabled()) return;
  const tasks: Promise<unknown>[] = [];

  if (ctx.customer.email) {
    const { subject, html, text } = buildCustomerOrderEmail(ctx);
    tasks.push(
      sendEmail({
        to: ctx.customer.email,
        subject,
        html,
        text,
        tags: [
          { name: "type", value: "order_customer" },
          { name: "order_id", value: ctx.orderId },
        ],
      }),
    );
  }

  const adminRecipients = getAdminRecipients();
  if (adminRecipients.length) {
    const { subject, html, text } = buildAdminOrderEmail(ctx, adminOrderLink(ctx.orderId));
    tasks.push(
      sendEmail({
        to: adminRecipients,
        subject,
        html,
        text,
        replyTo: ctx.customer.email || undefined,
        tags: [
          { name: "type", value: "order_admin" },
          { name: "order_id", value: ctx.orderId },
        ],
      }),
    );
  }

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
}

export async function sendOrderStatusUpdate(ctx: OrderStatusUpdateContext): Promise<void> {
  if (!isEmailEnabled()) return;
  if (!ctx.customerEmail) return;
  if (ctx.previousStatus && ctx.previousStatus === ctx.newStatus) return;

  const { subject, html, text } = buildCustomerStatusUpdateEmail(ctx);
  await sendEmail({
    to: ctx.customerEmail,
    subject,
    html,
    text,
    tags: [
      { name: "type", value: "order_status" },
      { name: "order_id", value: ctx.orderId },
      { name: "status", value: ctx.newStatus },
    ],
  });
}

export async function sendNewsletterWelcome(ctx: NewsletterWelcomeContext): Promise<void> {
  if (!isEmailEnabled()) return;
  if (!ctx.email) return;

  const { subject, html, text } = buildNewsletterWelcomeEmail(ctx);
  await sendEmail({
    to: ctx.email,
    subject,
    html,
    text,
    tags: [{ name: "type", value: "newsletter_welcome" }],
  });
}

export async function sendContactNotifications(ctx: Omit<ContactEmailContext, "adminUrl">): Promise<void> {
  if (!isEmailEnabled()) return;
  const recipients = getContactRecipients();
  if (!recipients.length) return;

  const { subject, html, text } = buildAdminContactEmail({
    ...ctx,
    adminUrl: adminContactLink(),
  });

  await sendEmail({
    to: recipients,
    subject,
    html,
    text,
    replyTo: ctx.email || undefined,
    tags: [{ name: "type", value: "contact_admin" }],
  });
}
