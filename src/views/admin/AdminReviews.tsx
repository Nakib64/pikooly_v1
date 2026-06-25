import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, X, Trash2, Star, MessageSquare } from "lucide-react";

interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  product_name?: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchReviews = async () => {
    const { data: reviewsData, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Get product names
    const productIds = [...new Set((reviewsData || []).map((r) => r.product_id))];
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds.length > 0 ? productIds : ["none"]);

    const productMap: Record<string, string> = {};
    (products || []).forEach((p) => { productMap[p.id] = p.name; });

    setReviews((reviewsData || []).map((r) => ({ ...r, product_name: productMap[r.product_id] || "Unknown" })));
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const approveReview = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Review approved" }); fetchReviews(); }
  };

  const rejectReview = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ is_approved: false }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Review rejected" }); fetchReviews(); }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Review deleted" }); fetchReviews(); }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "approved") return r.is_approved;
    if (filter === "pending") return !r.is_approved;
    return true;
  });

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Reviews</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{reviews.length} total</Badge>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-3 space-y-2"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-3 bg-muted rounded w-3/4" /></CardContent></Card>
          ))
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" /><p className="text-muted-foreground text-sm">No reviews found.</p></CardContent></Card>
        ) : (
          filtered.map((review) => (
            <Card key={review.id} className="overflow-hidden">
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{review.customer_name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{review.product_name}</p>
                    <div className="mt-1.5">{renderStars(review.rating)}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 font-medium ${review.is_approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {review.is_approved ? "Approved" : "Pending"}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{review.comment}</p>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString("en-GB")}</span>
                  <div className="flex items-center gap-0">
                    {!review.is_approved ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => approveReview(review.id)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => rejectReview(review.id)}>
                        <X className="h-4 w-4 text-amber-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteReview(review.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table Layout */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><div className="h-4 w-1/4 bg-muted rounded animate-pulse" /><div className="h-4 flex-1 bg-muted rounded animate-pulse" /><div className="h-4 w-12 bg-muted rounded animate-pulse" /><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /></div>)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No reviews found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="hidden md:table-cell">Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium text-sm">{review.customer_name}</TableCell>
                      <TableCell className="text-sm">{review.product_name}</TableCell>
                      <TableCell>{renderStars(review.rating)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{review.comment || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${review.is_approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          {review.is_approved ? "Approved" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {!review.is_approved ? (
                          <Button variant="ghost" size="icon" onClick={() => approveReview(review.id)} title="Approve">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => rejectReview(review.id)} title="Reject">
                            <X className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => deleteReview(review.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReviews;
