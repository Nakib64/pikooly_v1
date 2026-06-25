import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  productName: string;
  minQuantity?: number;
}

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name is required").max(100),
  customer_phone: z.string().trim().min(6, "Phone is required").max(20),
  customer_email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  company_name: z.string().trim().max(150).optional().or(z.literal("")),
  quantity: z.number().int().min(1, "Quantity required").max(100000),
  required_by: z.string().optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

const BulkQuoteDialog = ({ open, onOpenChange, productId, productName, minQuantity = 10 }: Props) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    company_name: "",
    quantity: minQuantity,
    required_by: "",
    message: "",
  });

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload: any = {
      product_id: productId,
      product_name: productName,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_email: parsed.data.customer_email || null,
      company_name: parsed.data.company_name || null,
      quantity: parsed.data.quantity,
      required_by: parsed.data.required_by || null,
      message: parsed.data.message || null,
    };
    const { error } = await supabase.from("bulk_quote_requests" as any).insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Quote request sent", description: "Our team will contact you shortly." });
    onOpenChange(false);
    setForm({ customer_name: "", customer_phone: "", customer_email: "", company_name: "", quantity: minQuantity, required_by: "", message: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Request Bulk Quote
          </DialogTitle>
          <DialogDescription className="text-xs">
            Tell us your requirement for <strong>{productName}</strong>. Our team will share a custom quote.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Your Name *</Label>
              <Input style={{ fontSize: 16 }} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input style={{ fontSize: 16 }} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" style={{ fontSize: 16 }} value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input style={{ fontSize: 16 }} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quantity * (min {minQuantity})</Label>
              <Input type="number" min={1} style={{ fontSize: 16 }} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Required By</Label>
              <Input type="date" style={{ fontSize: 16 }} value={form.required_by} onChange={(e) => setForm({ ...form, required_by: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Message / Customisation</Label>
            <Textarea rows={3} style={{ fontSize: 16 }} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Logo printing, packaging, delivery location etc." />
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Sending..." : "Send Quote Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkQuoteDialog;
