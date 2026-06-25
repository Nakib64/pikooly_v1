"use client";
import { useState } from "react";
import { useParams, useNavigate, Link } from "@/lib/router-adapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Gift, Trophy, MapPin, Phone, Mail, Package, Truck, CheckCircle2, Clock, Upload, ImageIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import SEOHead from "@/components/seo/SEOHead";

const statusConfig: Record<string, { label: string; icon: any; className: string; description: string }> = {
  pending: { label: "Preparing Your Gift", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200", description: "Our team is preparing your gift for dispatch." },
  dispatched: { label: "On the Way", icon: Truck, className: "bg-blue-100 text-blue-800 border-blue-200", description: "Your gift has been dispatched and is on its way." },
  delivered: { label: "Delivered", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200", description: "Your gift has been delivered." },
};

const LoyaltyRewardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: winner, isLoading } = useQuery({
    queryKey: ["loyalty-winner", id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_winners")
        .select("*, gift_item:loyalty_gift_items(image_url, description)")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (authLoading) return null;
  if (!user) { navigate("/auth"); return null; }

  if (isLoading) {
    return <main className="section-container py-8"><div className="animate-pulse h-64 bg-muted rounded-2xl" /></main>;
  }

  if (!winner) {
    return (
      <main className="section-container py-8 text-center">
        <p className="text-muted-foreground mb-4">Gift not found.</p>
        <Link to="/account" className="text-primary text-sm">← Back to My Account</Link>
      </main>
    );
  }

  const status = statusConfig[winner.dispatch_status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isConfirmed = !!winner.customer_confirmed_at;

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
      const res = await uploadToCloudinary(file, { folder: `loyalty/${user.id}`, resourceType: "image" });
      const { error: updErr } = await supabase
        .from("loyalty_winners")
        .update({ confirmation_photo_url: res.url })
        .eq("id", winner.id);
      if (updErr) throw updErr;
      toast.success("Photo uploaded!");
      qc.invalidateQueries({ queryKey: ["loyalty-winner", id] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setConfirming(true);
    try {
      const { error } = await supabase
        .from("loyalty_winners")
        .update({
          customer_confirmed_at: new Date().toISOString(),
          customer_feedback: feedback || null,
        })
        .eq("id", winner.id);
      if (error) throw error;
      toast.success("Thank you for confirming! 🎉");
      qc.invalidateQueries({ queryKey: ["loyalty-winner", id] });
      qc.invalidateQueries({ queryKey: ["loyalty-winners", user.id] });
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <main className="section-container py-4 sm:py-6 pb-2 md:pb-4 max-w-3xl space-y-4 sm:space-y-5">
      <SEOHead title="My Gift Reward — Pikooly" description="Your loyalty gift details and tracking." noindex />

      {/* Back */}
      <Link to="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back to My Account
      </Link>

      {/* Hero card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border rounded-2xl p-5 sm:p-6">
        {/* Decorative sparkles */}
        <Sparkles size={60} className="absolute -top-4 -right-4 text-primary/10 rotate-12" />
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 shadow-sm">
            <Trophy size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Loyalty Reward</p>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-tight">Congratulations!</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{status.description}</p>
        <Badge variant="outline" className={`${status.className} inline-flex items-center gap-1.5 px-2.5 py-1`}>
          <StatusIcon size={12} /> {status.label}
        </Badge>
      </div>

      {/* Gift Item Card */}
      <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <Gift size={16} className="text-primary" /> Your Gift
        </h2>
        <div className="flex gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-primary/10 to-muted overflow-hidden flex items-center justify-center shrink-0 border border-border">
            {winner.gift_item?.image_url ? (
              <img src={winner.gift_item.image_url} alt={winner.gift_name || "Gift"} className="w-full h-full object-cover" />
            ) : (
              <Gift size={32} className="text-primary/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground mb-1 leading-snug">{winner.gift_name || "Surprise Gift"}</h3>
            <p className="text-xs text-muted-foreground mb-1">
              Won on {format(new Date(winner.created_at), "MMMM dd, yyyy")}
            </p>
            {winner.batch_number && (
              <p className="text-xs text-muted-foreground">Batch #{winner.batch_number} • {winner.total_orders_at_draw} orders milestone</p>
            )}
            {winner.gift_item?.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{winner.gift_item.description}</p>
            )}
          </div>
        </div>

        {/* Gift card message */}
        {winner.gift_card_message && (
          <div className="mt-4 bg-gradient-to-br from-primary/5 to-background border border-primary/20 rounded-xl p-4 relative">
            <Sparkles size={14} className="absolute top-3 right-3 text-primary/60" />
            <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Gift Card Message</p>
            <p className="text-sm text-foreground italic leading-relaxed">"{winner.gift_card_message}"</p>
          </div>
        )}
      </section>

      {/* Pickup / Delivery Instructions */}
      {winner.pickup_instructions && (
        <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-display font-semibold text-foreground mb-2 flex items-center gap-2">
            <Package size={16} className="text-primary" /> Pickup / Delivery Instructions
          </h2>
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{winner.pickup_instructions}</p>
        </section>
      )}

      {/* Delivery Address */}
      <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-primary" /> Delivery Details
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-xs min-w-[70px] pt-0.5">Name:</span>
            <span className="text-foreground font-medium">{winner.customer_name}</span>
          </div>
          {winner.delivery_address && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground text-xs min-w-[70px] pt-0.5">Address:</span>
              <span className="text-foreground">{winner.delivery_address}</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Phone size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">{winner.customer_phone}</span>
          </div>
          {winner.customer_email && (
            <div className="flex items-start gap-2">
              <Mail size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-foreground">{winner.customer_email}</span>
            </div>
          )}
        </div>
      </section>

      {/* Tracking timeline */}
      <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Truck size={16} className="text-primary" /> Tracking
        </h2>
        <div className="space-y-3">
          <TimelineItem
            done
            icon={Trophy}
            label="Selected as Winner"
            date={format(new Date(winner.created_at), "MMM dd, yyyy • h:mm a")}
          />
          <TimelineItem
            done={["dispatched", "delivered"].includes(winner.dispatch_status)}
            icon={Package}
            label="Dispatched"
            date={winner.dispatched_at ? format(new Date(winner.dispatched_at), "MMM dd, yyyy • h:mm a") : "Pending"}
          />
          <TimelineItem
            done={winner.dispatch_status === "delivered"}
            icon={Truck}
            label="Delivered by Pikooly"
            date={winner.dispatch_status === "delivered" ? "Marked by admin" : "Pending"}
          />
          <TimelineItem
            done={isConfirmed}
            icon={CheckCircle2}
            label="Receipt Confirmed by You"
            date={isConfirmed ? format(new Date(winner.customer_confirmed_at), "MMM dd, yyyy • h:mm a") : "Awaiting your confirmation"}
            last
          />
        </div>

        {winner.admin_notes && (
          <div className="mt-4 bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Admin Note</p>
            <p className="text-xs text-foreground">{winner.admin_notes}</p>
          </div>
        )}
      </section>

      {/* Confirmation block */}
      <section className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-primary" /> Confirm Receipt
        </h2>

        {isConfirmed ? (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">You confirmed receipt</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  on {format(new Date(winner.customer_confirmed_at), "MMMM dd, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            {winner.customer_feedback && (
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Your Feedback</p>
                <p className="text-sm text-foreground">{winner.customer_feedback}</p>
              </div>
            )}
            {winner.confirmation_photo_url && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Delivery Photo</p>
                <img src={winner.confirmation_photo_url} alt="Delivery confirmation" className="w-full max-w-xs rounded-xl border border-border" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Once you receive your gift, please confirm below. You can optionally share feedback or upload a delivery photo.
            </p>

            <Textarea
              placeholder="Share your feedback (optional)…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="text-base resize-none"
              rows={3}
              style={{ fontSize: "16px" }}
            />

            <div>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors text-sm">
                <Upload size={16} className="text-primary" />
                <span className="text-foreground">
                  {uploading ? "Uploading…" : winner.confirmation_photo_url ? "Replace delivery photo" : "Upload delivery photo (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                />
              </label>
              {winner.confirmation_photo_url && (
                <img src={winner.confirmation_photo_url} alt="Uploaded" className="mt-2 w-full max-w-xs rounded-xl border border-border" />
              )}
            </div>

            <Button
              onClick={handleConfirmReceipt}
              disabled={confirming}
              className="w-full"
              size="lg"
            >
              <CheckCircle2 size={16} className="mr-2" />
              {confirming ? "Confirming…" : "Confirm I Received My Gift"}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
};

const TimelineItem = ({ done, icon: Icon, label, date, last }: { done: boolean; icon: any; label: string; date: string; last?: boolean }) => (
  <div className="flex gap-3 relative">
    {!last && (
      <div className={`absolute left-[15px] top-9 bottom-[-12px] w-px ${done ? "bg-primary/40" : "bg-border"}`} />
    )}
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
      <Icon size={14} />
    </div>
    <div className="flex-1 min-w-0 pb-2">
      <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  </div>
);

export default LoyaltyRewardDetail;
