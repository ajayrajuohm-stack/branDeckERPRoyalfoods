import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  ShoppingBag,
  Factory,
  BarChart3,
  Download,
  Package,
  Pencil,
  LogOut,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useAdminSettings } from "@/hooks/use-erp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/* =======================
   SIDEBAR ITEM
======================= */
function SidebarItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2 text-sm rounded-md",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

/* =======================
   ADMIN PROFILE
======================= */
function AdminProfileEditor() {
  const { data, update } = useAdminSettings();

  const settings = data?.data; // ✅ THIS IS THE FIX

  const [open, setOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isServiceActive, setIsServiceActive] = useState(true);

  const openDialog = (state: boolean) => {
    if (state && settings) {
      setAdminName(settings.adminName ?? "");
      setCompanyName(settings.companyName ?? "");
      setPhone(settings.phone ?? "");
      setEmail(settings.email ?? "");
      setIsServiceActive(settings.isServiceActive ?? true);
    }
    setOpen(state);
  };

  const save = () => {
    update.mutate(
      { adminName, companyName, phone, email, isServiceActive },
      { onSuccess: () => setOpen(false) }
    );
  };

  const initials =
    settings?.adminName
      ?.split(" ")
      .map((c: string) => c[0])
      .join("")
      .slice(0, 2) || "AD";

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted rounded-md">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {settings?.adminName || "Admin"}
            </p>
            <p className="text-xs text-muted-foreground">
              {settings?.companyName || ""}
            </p>
          </div>
          <Pencil className="w-4 h-4 text-muted-foreground" />
        </div>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Label>Admin Name</Label>
          <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />

          <Label>Company Name</Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />

          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />

          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label className="text-base">Service Status</Label>
              <p className="text-xs text-muted-foreground">
                Turning this off will suspend all client services.
              </p>
            </div>
            <Switch
              checked={isServiceActive}
              onCheckedChange={setIsServiceActive}
              className="data-[state=unchecked]:bg-destructive"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =======================
   SIDEBAR CONTENT (REUSABLE)
======================= */
export function SidebarContent({ onInteract }: { onInteract?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-6 border-b font-bold flex items-center gap-2">
        <Package className="w-6 h-6 text-primary" />
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">BranDeck ERP</span>
      </div>

      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div onClick={onInteract}>
          <SidebarItem href="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem href="/masters" icon={Database} label="Masters" />
          <SidebarItem href="/transactions" icon={ShoppingCart} label="Purchases" />
          <SidebarItem href="/sales" icon={ShoppingBag} label="Sales" />
          <SidebarItem href="/production" icon={Factory} label="Production" />
          <SidebarItem href="/stock" icon={Package} label="Stock" />
          <SidebarItem href="/reports" icon={BarChart3} label="Reports" />
          <SidebarItem href="/backup" icon={Download} label="Backup" />
          <SidebarItem href="/trash" icon={Trash2} label="Trash" />
        </div>
      </div>

      <div className="p-4 border-t space-y-2">
        <AdminProfileEditor />
        <LogoutButton />
      </div>
    </div>
  );
}

function LogoutButton() {
  const { logoutMutation, user } = useAuth();
  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground hover:text-destructive"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      <LogOut className="w-4 h-4 mr-2" />
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}

/* =======================
   SIDEBAR (DESKTOP)
======================= */
export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 border-r h-screen sticky top-0 flex-col shrink-0">
      <SidebarContent />
    </aside>
  );
}
