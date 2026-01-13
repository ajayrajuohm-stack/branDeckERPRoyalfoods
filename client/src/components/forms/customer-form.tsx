import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomers } from "@/hooks/use-erp";

/* =======================
   CREATE FORM
======================= */
export function CustomerForm({ onSuccess }: { onSuccess?: () => void }) {
  const { create } = useCustomers();

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    contactInfo: "",
    address: "",
    shippingAddress: "",
    gstNumber: "",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    create.mutate(form, {
      onSuccess: () => {
        // ✅ reset form
        setForm({
          name: "",
          contactPerson: "",
          contactInfo: "",
          address: "",
          shippingAddress: "",
          gstNumber: "",
        });

        // ✅ close modal + refresh list (handled by MasterView)
        onSuccess?.();
      },
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          required
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Contact Person</Label>
        <Input
          value={form.contactPerson}
          onChange={(e) =>
            setForm({ ...form, contactPerson: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Contact Info</Label>
        <Input
          value={form.contactInfo}
          onChange={(e) =>
            setForm({ ...form, contactInfo: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Address</Label>
        <Input
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Shipping Address</Label>
        <Input
          value={form.shippingAddress}
          onChange={(e) =>
            setForm({ ...form, shippingAddress: e.target.value })
          }
        />
      </div>
      <div>
        <Label>GST Number</Label>
        <Input
          value={form.gstNumber}
          onChange={(e) =>
            setForm({ ...form, gstNumber: e.target.value })
          }
        />
      </div>

      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

/* =======================
   EDIT FORM
======================= */
export function CustomerEditForm({
  item,
  onSuccess,
}: {
  item: any;
  onSuccess?: () => void;
}) {
  const { update } = useCustomers();

  const [form, setForm] = useState({
    name: item.name ?? "",
    contactPerson: item.contactPerson ?? "",
    contactInfo: item.contactInfo ?? "",
    address: item.address ?? "",
    shippingAddress: item.shippingAddress ?? "",
    gstNumber: item.gstNumber ?? "",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    update.mutate(
      { id: item.id, ...form },
      {
        onSuccess: () => {
          // ✅ close modal + refresh list
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Contact Person</Label>
        <Input
          value={form.contactPerson}
          onChange={(e) =>
            setForm({ ...form, contactPerson: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Contact Info</Label>
        <Input
          value={form.contactInfo}
          onChange={(e) =>
            setForm({ ...form, contactInfo: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Address</Label>
        <Input
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Shipping Address</Label>
        <Input
          value={form.shippingAddress}
          onChange={(e) =>
            setForm({ ...form, shippingAddress: e.target.value })
          }
        />
      </div>
      <div>
        <Label>GST Number</Label>
        <Input
          value={form.gstNumber}
          onChange={(e) =>
            setForm({ ...form, gstNumber: e.target.value })
          }
        />
      </div>

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Saving..." : "Update"}
      </Button>
    </form>
  );
}
