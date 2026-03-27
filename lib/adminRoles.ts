export type AdminPermission =
  | "*"
  | "dashboard.view"
  | "webshop.manage"
  | "content.manage"
  | "fulfillment.manage"
  | "integrations.manage"
  | "catalog.manage"
  | "customer.manage"
  | "marketing.manage"
  | "preview.manage"
  | "admin.users.manage";

export type AdminRoleId = "owner" | "manager" | "content_editor" | "operations" | "preview_manager";

export type AdminRoleDefinition = {
  id: AdminRoleId;
  label: string;
  description: string;
  permissions: AdminPermission[];
};

export type AdminViewer = {
  id: string;
  username: string;
  displayName: string;
  roleIds: AdminRoleId[];
  permissions: AdminPermission[];
};

const ADMIN_ROLE_DEFINITIONS: AdminRoleDefinition[] = [
  {
    id: "owner",
    label: "Owner",
    description: "Pun pristup celom adminu, ukljucujuci korisnike i privilegije.",
    permissions: ["*"],
  },
  {
    id: "manager",
    label: "Manager",
    description: "Svakodnevni pregled shopa, sadrzaja, porudzbina i marketinga.",
    permissions: [
      "dashboard.view",
      "webshop.manage",
      "content.manage",
      "fulfillment.manage",
      "catalog.manage",
      "customer.manage",
      "marketing.manage",
    ],
  },
  {
    id: "content_editor",
    label: "Content Editor",
    description: "Uredjuje javni sadrzaj, blog i promotivne blokove.",
    permissions: ["dashboard.view", "content.manage", "marketing.manage"],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Vodi porudzbine, fulfilment, katalog i kontakt tok.",
    permissions: [
      "dashboard.view",
      "webshop.manage",
      "fulfillment.manage",
      "catalog.manage",
      "customer.manage",
    ],
  },
  {
    id: "preview_manager",
    label: "Preview Manager",
    description: "Odrzava custom-suits preview, fabrics, buttons i tuning.",
    permissions: ["dashboard.view", "catalog.manage", "preview.manage"],
  },
];

const roleMap = new Map(ADMIN_ROLE_DEFINITIONS.map((role) => [role.id, role] as const));

export const getAdminRoleDefinitions = () => ADMIN_ROLE_DEFINITIONS;

export const getAdminPermissionsForRoles = (roleIds: AdminRoleId[]): AdminPermission[] => {
  const permissions = new Set<AdminPermission>();
  for (const roleId of roleIds) {
    const role = roleMap.get(roleId);
    if (!role) continue;
    for (const permission of role.permissions) permissions.add(permission);
  }
  return Array.from(permissions);
};

export const isKnownAdminRole = (roleId: string): roleId is AdminRoleId => roleMap.has(roleId as AdminRoleId);
