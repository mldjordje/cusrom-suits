import { listContactMessages } from "@/lib/contact/messages";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import AdminPoslovneUniformePage from "./AdminPoslovneUniformePage";

export const dynamic = "force-dynamic";

export default async function PoslovneUniformeAdminPage() {
  const [settings, allMessages] = await Promise.all([
    getLandingSettings(),
    listContactMessages(),
  ]);

  const inquiries = allMessages.filter((m) => m.source === "business-uniforms");

  return (
    <AdminPoslovneUniformePage
      initialImages={settings.uniformsImages}
      initialVideos={settings.uniformsVideos}
      initialTitle={settings.uniformsTitle}
      initialEyebrow={settings.uniformsEyebrow}
      initialText={settings.uniformsText}
      initialInquiries={inquiries}
    />
  );
}
