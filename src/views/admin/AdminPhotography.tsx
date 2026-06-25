import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, MapPin, DollarSign, Image, Trash2, Plus, Edit, CalendarCheck, Clock, TrendingUp, Users, CheckCircle2, XCircle, Eye, Video, Search as SearchIcon } from "lucide-react";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { useCurrency } from "@/hooks/useCurrency";
import PageContentEditor from "@/components/admin/PageContentEditor";

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Clock },
  approved: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: Eye },
  completed: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2 },
  cancelled: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: XCircle },
};

const normalizeBookingStatus = (status?: string) => {
  if (!status) return "pending";
  return status === "complete" ? "completed" : status;
};

const AdminPhotography = () => {
  const qc = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("bookings");

  // Bookings
  const { data: bookings } = useQuery({
    queryKey: ["admin-photo-bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_bookings").select("*, photo_services(title), photo_packages(name, duration)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const normalizedStatus = normalizeBookingStatus(status);
      const { data, error } = await supabase
        .from("photo_bookings")
        .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id, status, updated_at")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Booking update failed");

      return { id, status: normalizedStatus };
    },
    onMutate: async ({ id, status }) => {
      const normalizedStatus = normalizeBookingStatus(status);
      await qc.cancelQueries({ queryKey: ["admin-photo-bookings"] });

      const previousBookings = qc.getQueryData<any[]>(["admin-photo-bookings"]);

      qc.setQueryData(["admin-photo-bookings"], (current: any[] | undefined) =>
        (current || []).map((booking) =>
          booking.id === id
            ? { ...booking, status: normalizedStatus, updated_at: new Date().toISOString() }
            : booking
        )
      );

      return { previousBookings };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBookings) {
        qc.setQueryData(["admin-photo-bookings"], context.previousBookings);
      }
      toast.error("Booking update failed");
    },
    onSuccess: (_data, variables) => {
      const normalizedStatus = normalizeBookingStatus(variables.status);
      toast.success(normalizedStatus === "completed" ? "Booking marked as completed" : "Booking updated");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-photo-bookings"] });
      await qc.refetchQueries({ queryKey: ["admin-photo-bookings"] });
    },
  });

  const normalizedBookings = useMemo(
    () => (bookings || []).map((booking: any) => ({ ...booking, status: normalizeBookingStatus(booking.status) })),
    [bookings]
  );

  const outsideDhakaBookings = normalizedBookings.filter((b: any) => b.location_type === "outside_dhaka");

  // Travel fees
  const { data: travelFees } = useQuery({
    queryKey: ["admin-travel-fees"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_travel_fees").select("*").order("district");
      return data || [];
    },
  });

  const [editFee, setEditFee] = useState<any>(null);
  const updateFee = useMutation({
    mutationFn: async (fee: any) => {
      const { error } = await supabase.from("photo_travel_fees").update({ fee: fee.fee, is_available: fee.is_available }).eq("id", fee.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-travel-fees"] }); toast.success("Fee updated"); setEditFee(null); },
  });

  // Services & Packages
  const { data: services } = useQuery({
    queryKey: ["admin-photo-services"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_services").select("*").order("display_order");
      return data || [];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["admin-photo-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_packages").select("*").order("display_order");
      return data || [];
    },
  });

  // Edit Service
  const [editService, setEditService] = useState<any>(null);
  const updateService = useMutation({
    mutationFn: async (svc: any) => {
      const { error } = await supabase.from("photo_services").update({
        title: svc.title,
        short_description: svc.short_description,
        description: svc.description,
        image_url: svc.image_url,
        starting_price: svc.starting_price,
        is_active: svc.is_active,
        is_featured: svc.is_featured,
      }).eq("id", svc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-photo-services"] });
      qc.invalidateQueries({ queryKey: ["photo-services"] });
      qc.invalidateQueries({ queryKey: ["home-photo-services"] });
      toast.success("Service updated");
      setEditService(null);
    },
  });

  const [editPkg, setEditPkg] = useState<any>(null);
  const updatePkg = useMutation({
    mutationFn: async (pkg: any) => {
      const { error } = await supabase.from("photo_packages").update({ price: pkg.price, name: pkg.name, duration: pkg.duration }).eq("id", pkg.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-photo-packages"] }); toast.success("Package updated"); setEditPkg(null); },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("photo_services").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-photo-services"] }); qc.invalidateQueries({ queryKey: ["home-photo-services"] }); toast.success("Featured status updated"); },
  });

  // Portfolio
  const { data: portfolio } = useQuery({
    queryKey: ["admin-photo-portfolio"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_portfolio").select("*").order("display_order");
      return data || [];
    },
  });

  const [newMedia, setNewMedia] = useState({ title: "", media_type: "photo", media_url: "", video_embed_url: "", thumbnail_url: "" });
  const addMedia = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("photo_portfolio").insert({ ...newMedia, display_order: (portfolio?.length || 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-photo-portfolio"] });
      toast.success("Media added");
      setNewMedia({ title: "", media_type: "photo", media_url: "", video_embed_url: "", thumbnail_url: "" });
    },
  });

  const deleteMedia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("photo_portfolio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-photo-portfolio"] }); toast.success("Deleted"); },
  });

  // Stats
  const totalBookings = normalizedBookings.length;
  const pendingCount = normalizedBookings.filter((b: any) => b.status === "pending").length;
  const completedCount = normalizedBookings.filter((b: any) => b.status === "completed").length;
  const totalRevenue = normalizedBookings
    .filter((b: any) => b.status === "completed")
    .reduce((sum: number, b: any) => sum + Number(b.total || 0), 0);

  const renderBookingActions = (booking: any, compact = false) => {
    const isUpdatingThisBooking = updateBookingStatus.isPending && updateBookingStatus.variables?.id === booking.id;

    if (booking.status === "completed") {
      return (
        <Badge variant="outline" className="h-8 rounded-lg border-primary/20 bg-primary/5 px-3 text-xs text-primary">
          Completed
        </Badge>
      );
    }

    if (booking.status === "cancelled") {
      return (
        <Badge variant="outline" className="h-8 rounded-lg border-destructive/20 bg-destructive/5 px-3 text-xs text-destructive">
          Cancelled
        </Badge>
      );
    }

    return (
      <div className={`flex ${compact ? "flex-col items-stretch" : "flex-wrap items-center"} gap-2`}>
        {booking.status === "pending" && (
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={isUpdatingThisBooking}
            onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "approved" })}
          >
            {isUpdatingThisBooking ? "Updating..." : "Approve"}
          </Button>
        )}

        {booking.status === "approved" && (
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={isUpdatingThisBooking}
            onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "completed" })}
          >
            {isUpdatingThisBooking ? "Updating..." : "Mark Complete"}
          </Button>
        )}

        {booking.status !== "cancelled" && booking.status !== "completed" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border-destructive/20 text-xs text-destructive hover:bg-destructive/10"
            disabled={isUpdatingThisBooking}
            onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "cancelled" })}
          >
            Cancel Booking
          </Button>
        )}
      </div>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Camera className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Photography Management</h1>
          <p className="text-xs text-muted-foreground">Manage bookings, pricing & portfolio</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Bookings", value: totalBookings, icon: CalendarCheck, color: "text-primary" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-600" },
          { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Revenue", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-primary" },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="h-auto p-1 bg-muted/50 rounded-xl inline-flex w-max md:w-full md:grid md:grid-cols-7 gap-1">
            {[
              { value: "bookings", label: "Bookings", icon: CalendarCheck },
              { value: "services", label: "Services", icon: Camera },
              { value: "outside", label: "Outside Dhaka", icon: MapPin },
              { value: "pricing", label: "Pricing", icon: DollarSign },
              { value: "travel", label: "Travel Fees", icon: TrendingUp },
              { value: "portfolio", label: "Portfolio", icon: Image },
              { value: "seo", label: "Page SEO", icon: SearchIcon },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1.5 py-2 px-3 whitespace-nowrap"
              >
                <tab.icon className="h-3.5 w-3.5 hidden md:block" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg">All Bookings</CardTitle>
                <Badge variant="outline" className="text-xs">{totalBookings} total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {normalizedBookings.map((b: any) => (
                  <div key={b.id} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-mono text-xs font-medium text-primary">{b.booking_number}</p>
                        <p className="font-semibold text-sm text-foreground">{b.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {b.photo_services?.title}</span>
                      <span>{b.photo_packages?.name}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div>
                        <p className="text-xs text-muted-foreground">{b.event_date} {b.event_time && `• ${b.event_time}`}</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(b.total)}</p>
                      </div>
                       {renderBookingActions(b, true)}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/30">
                      <TableHead className="text-xs font-medium text-muted-foreground">Booking #</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Customer</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Service</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Total</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalizedBookings.map((b: any) => (
                      <TableRow key={b.id} className="border-border/20 hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-primary font-medium">{b.booking_number}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{b.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{b.photo_services?.title}</p>
                          <p className="text-xs text-muted-foreground">{b.photo_packages?.name}</p>
                        </TableCell>
                        <TableCell className="text-sm">{b.event_date}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatCurrency(b.total)}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell>
                           {renderBookingActions(b)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {(!bookings || bookings.length === 0) && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No bookings yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Bookings will appear here once customers start booking</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Manage Services</CardTitle>
                  <p className="text-xs text-muted-foreground">Edit service details, images & pricing</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {services?.map((svc: any) => (
                <div key={svc.id} className="rounded-xl border border-border/50 p-4 space-y-4">
                  {editService?.id === svc.id ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Title</label>
                          <Input value={editService.title} onChange={(e) => setEditService({ ...editService, title: e.target.value })} className="rounded-lg" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Short Description</label>
                          <Textarea value={editService.short_description || ""} onChange={(e) => setEditService({ ...editService, short_description: e.target.value })} className="rounded-lg min-h-[60px]" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Description</label>
                          <Textarea value={editService.description || ""} onChange={(e) => setEditService({ ...editService, description: e.target.value })} className="rounded-lg min-h-[80px]" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Starting Price</label>
                          <Input type="number" value={editService.starting_price} onChange={(e) => setEditService({ ...editService, starting_price: Number(e.target.value) })} className="rounded-lg" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Image</label>
                          {editService.image_url && (
                            <img src={editService.image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-2" />
                          )}
                          <CloudinaryUpload value={editService.image_url || ""} onChange={(url) => setEditService({ ...editService, image_url: url })} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Active</span>
                            <Switch checked={editService.is_active} onCheckedChange={(v) => setEditService({ ...editService, is_active: v })} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Featured</span>
                            <Switch checked={editService.is_featured} onCheckedChange={(v) => setEditService({ ...editService, is_featured: v })} />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 rounded-lg h-9 text-xs" onClick={() => updateService.mutate(editService)} disabled={updateService.isPending}>
                          {updateService.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg h-9 text-xs" onClick={() => setEditService(null)}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-4 items-start">
                      {svc.image_url ? (
                        <img src={svc.image_url} alt={svc.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                          <Camera className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-foreground">{svc.title}</h3>
                          {!svc.is_active && <Badge variant="outline" className="text-[10px] rounded-md">Inactive</Badge>}
                          {svc.is_featured && <Badge className="text-[10px] rounded-md bg-primary/10 text-primary border-0">Featured</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{svc.short_description}</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(svc.starting_price)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs shrink-0" onClick={() => setEditService({ ...svc })}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {(!services || services.length === 0) && (
                <div className="text-center py-8">
                  <Camera className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No services found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outside Dhaka Tab */}
        <TabsContent value="outside" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Outside Dhaka Requests</CardTitle>
                  <p className="text-xs text-muted-foreground">Track expansion demand by district</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* District Demand Grid */}
              {travelFees?.filter((t: any) => t.district !== "Dhaka" && t.request_count > 0).length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {travelFees?.filter((t: any) => t.district !== "Dhaka" && t.request_count > 0).map((t: any) => (
                    <div key={t.id} className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4 text-center">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t.district}</p>
                      <p className="text-3xl font-bold text-primary">{t.request_count}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">requests</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-muted/30 border border-dashed border-border/50 p-6 text-center">
                  <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No district requests tracked yet</p>
                </div>
              )}

              {/* Booking List */}
              {outsideDhakaBookings.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Booking Requests</h3>
                  {outsideDhakaBookings.map((b: any) => (
                    <div key={b.id} className="rounded-xl border border-border/50 p-4 flex justify-between items-start gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{b.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{b.customer_phone} • {b.district}</p>
                        <p className="text-xs text-muted-foreground">{b.event_date} — {b.photo_services?.title}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No outside Dhaka booking requests yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Package Pricing</CardTitle>
                  <p className="text-xs text-muted-foreground">Manage service packages & rates</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {services?.map((svc: any) => (
                <div key={svc.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <h3 className="font-semibold text-foreground">{svc.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Featured</span>
                      <Switch
                        checked={svc.is_featured}
                        onCheckedChange={(checked) => toggleFeatured.mutate({ id: svc.id, is_featured: checked })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {packages?.filter((p: any) => p.service_id === svc.id).map((pkg: any) => (
                      <div key={pkg.id} className="rounded-xl border border-border/50 p-4 hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{pkg.duration}</p>
                          </div>
                          <span className="text-lg font-bold text-primary">{formatCurrency(pkg.price)}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setEditPkg({ ...pkg })} className="w-full h-8 text-xs rounded-lg border-border/50">
                          <Edit className="h-3 w-3 mr-1.5" /> Edit Price
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Travel Fees Tab */}
        <TabsContent value="travel" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Travel Conveyance Fees</CardTitle>
                  <p className="text-xs text-muted-foreground">Set location-based travel charges</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {travelFees?.map((t: any) => (
                  <div key={t.id} className="rounded-xl border border-border/50 p-4 hover:border-primary/20 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${t.is_available ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                        <p className="font-semibold text-sm text-foreground">{t.district}</p>
                      </div>
                      <Badge variant={t.is_available ? "default" : "secondary"} className="text-[10px] h-5 rounded-md">
                        {t.is_available ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-primary mb-1">{formatCurrency(t.fee)}</p>
                    <p className="text-[11px] text-muted-foreground mb-3">{t.request_count} requests</p>
                    <Button size="sm" variant="outline" className="w-full h-8 text-xs rounded-lg border-border/50" onClick={() => setEditFee({ ...t })}>
                      <Edit className="h-3 w-3 mr-1.5" /> Edit Fee
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Image className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg">Portfolio Gallery</CardTitle>
                  <p className="text-xs text-muted-foreground">{portfolio?.length || 0} items in gallery</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Section */}
              <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">Add New Media</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="Title" value={newMedia.title} onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })} className="h-9 text-sm rounded-lg" />
                  <Select value={newMedia.media_type} onValueChange={(v) => setNewMedia({ ...newMedia, media_type: v })}>
                    <SelectTrigger className="h-9 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo"><span className="flex items-center gap-2"><Image className="h-3 w-3" /> Photo</span></SelectItem>
                      <SelectItem value="video"><span className="flex items-center gap-2"><Video className="h-3 w-3" /> Video</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newMedia.media_type === "photo" ? (
                  <CloudinaryUpload folder="photography/portfolio" onChange={(url) => setNewMedia({ ...newMedia, media_url: url })} value={newMedia.media_url} label="Upload Photo" />
                ) : (
                  <div className="space-y-3">
                    <Input placeholder="Video Embed URL (YouTube/Vimeo)" value={newMedia.video_embed_url} onChange={(e) => setNewMedia({ ...newMedia, video_embed_url: e.target.value, media_url: e.target.value })} className="h-9 text-sm rounded-lg" />
                    <CloudinaryUpload folder="photography/thumbnails" onChange={(url) => setNewMedia({ ...newMedia, thumbnail_url: url })} value={newMedia.thumbnail_url} label="Thumbnail Image" />
                  </div>
                )}
                <Button onClick={() => addMedia.mutate()} disabled={!newMedia.media_url} className="rounded-lg h-9 text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add to Portfolio
                </Button>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {portfolio?.map((item: any) => (
                  <div key={item.id} className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                    {item.media_type === "photo" ? (
                      <img src={item.media_url} alt={item.title} className="w-full aspect-square object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full aspect-square bg-muted/50 flex items-center justify-center relative">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Video className="h-8 w-8 text-muted-foreground" />
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-foreground/70 text-background text-[9px] h-4 px-1.5 rounded-md">VIDEO</Badge>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center backdrop-blur-sm">
                      <Button size="sm" variant="destructive" className="rounded-lg h-8 text-xs" onClick={() => deleteMedia.mutate(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                    {item.title && (
                      <div className="p-2.5 bg-card">
                        <p className="text-xs font-medium truncate text-foreground">{item.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {(!portfolio || portfolio.length === 0) && (
                <div className="text-center py-12 rounded-xl bg-muted/20 border border-dashed border-border/50">
                  <Image className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground font-medium">No portfolio items yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload photos and videos to showcase your work</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Page SEO Tab */}
        <TabsContent value="seo" className="mt-4">
          <PageSEOTab />
        </TabsContent>
      </Tabs>

      {/* Edit Package Dialog */}
      <Dialog open={!!editPkg} onOpenChange={() => setEditPkg(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-primary" /> Edit Package
            </DialogTitle>
          </DialogHeader>
          {editPkg && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Package Name</label>
                <Input value={editPkg.name} onChange={(e) => setEditPkg({ ...editPkg, name: e.target.value })} className="rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duration</label>
                <Input value={editPkg.duration} onChange={(e) => setEditPkg({ ...editPkg, duration: e.target.value })} className="rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price</label>
                <Input type="number" value={editPkg.price} onChange={(e) => setEditPkg({ ...editPkg, price: Number(e.target.value) })} className="rounded-lg" />
              </div>
              <Button onClick={() => updatePkg.mutate(editPkg)} className="w-full rounded-lg">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Travel Fee Dialog */}
      <Dialog open={!!editFee} onOpenChange={() => setEditFee(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Edit Travel Fee — {editFee?.district}
            </DialogTitle>
          </DialogHeader>
          {editFee && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fee Amount</label>
                <Input type="number" value={editFee.fee} onChange={(e) => setEditFee({ ...editFee, fee: Number(e.target.value) })} className="rounded-lg" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div>
                  <p className="text-sm font-medium">Available for Booking</p>
                  <p className="text-xs text-muted-foreground">Enable to allow bookings in this area</p>
                </div>
                <Switch checked={editFee.is_available} onCheckedChange={(c) => setEditFee({ ...editFee, is_available: c })} />
              </div>
              <Button onClick={() => updateFee.mutate(editFee)} className="w-full rounded-lg">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Page SEO Sub-component ─── */
const SEO_KEYS = [
  "photo_seo_title",
  "photo_seo_description",
  "photo_hero_title",
  "photo_hero_subtitle",
  "photo_og_image",
] as const;

const PageSEOTab = () => {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: seoSettings } = useQuery({
    queryKey: ["photo-seo-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", [...SEO_KEYS]);
      const map: Record<string, string> = {};
      data?.forEach((s) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  useEffect(() => {
    if (seoSettings) setForm(seoSettings);
  }, [seoSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of SEO_KEYS) {
        const val = form[key] || "";
        const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
        if (existing) {
          await supabase.from("site_settings").update({ value: val }).eq("key", key);
        } else {
          await supabase.from("site_settings").insert({ key, value: val });
        }
      }
      toast.success("SEO settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Page SEO Settings</CardTitle>
        <p className="text-xs text-muted-foreground">/photography পেজের SEO ও Hero কনটেন্ট এডিট করুন</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4">

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hero Title</label>
            <Input
              value={form.photo_hero_title || ""}
              onChange={(e) => setForm({ ...form, photo_hero_title: e.target.value })}
              placeholder="Capture Your Moments"
              className="rounded-lg"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Use &lt;span class='text-primary'&gt;word&lt;/span&gt; for highlight</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hero Subtitle</label>
            <Input
              value={form.photo_hero_subtitle || ""}
              onChange={(e) => setForm({ ...form, photo_hero_subtitle: e.target.value })}
              placeholder="Professional photography services..."
              className="rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">OG Image URL</label>
            <Input
              value={form.photo_og_image || ""}
              onChange={(e) => setForm({ ...form, photo_og_image: e.target.value })}
              placeholder="https://..."
              className="rounded-lg"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-lg">
          {saving ? "Saving..." : "Save SEO Settings"}
        </Button>
      </CardContent>
    </Card>

    <Separator className="my-6" />

    {/* Page Content (Long Description, FAQ, Images) */}
    <PageContentEditor prefix="photography" title="Photography" />
    </>
  );
};

export default AdminPhotography;
