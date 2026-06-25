"use client";
import { useParams, Link } from "@/lib/router-adapter";
import { Calendar, ArrowLeft, Clock, Share2, List, ChevronDown, Copy, Check, Facebook, Twitter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, Fragment } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/seo/SEOHead";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BlogGiftSidebar from "@/components/blog/BlogGiftSidebar";
import { slugify } from "@/lib/utils";
import { AdSlot } from "@/components/ads/AdSense";

// Caption card: shows quote text + share/copy buttons
const CaptionCard = ({ text, shareUrl }: { text: string; shareUrl: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Caption copied!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed");
    }
  };
  const encoded = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(shareUrl);
  return (
    <div className="my-5 sm:my-6 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4 sm:p-6 shadow-sm">
      <p className="text-center text-foreground text-[15px] sm:text-lg leading-[1.85] font-medium whitespace-pre-wrap">
        {text}
      </p>
      <div className="mt-4 sm:mt-5 flex items-center justify-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
        <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">Share:</span>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encoded}`}
          target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"
          className="w-9 h-9 rounded-full bg-[#1877F2] hover:opacity-90 flex items-center justify-center text-white transition"
        ><Facebook size={16} fill="white" /></a>
        <a
          href={`https://wa.me/?text=${encoded}%20${encodedUrl}`}
          target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp"
          className="w-9 h-9 rounded-full bg-[#25D366] hover:opacity-90 flex items-center justify-center text-white transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encoded}&url=${encodedUrl}`}
          target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter"
          className="w-9 h-9 rounded-full bg-[#1DA1F2] hover:opacity-90 flex items-center justify-center text-white transition"
        ><Twitter size={16} fill="white" /></a>
        <button
          onClick={handleCopy}
          className="h-9 px-4 rounded-full bg-primary hover:opacity-90 flex items-center gap-1.5 text-primary-foreground text-xs font-semibold transition"
        >
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
    </div>
  );
};

// Splits content into HTML segments and caption blocks marked by [caption]...[/caption]
const renderContentWithCaptions = (
  html: string,
  proseClasses: string,
  shareUrl: string,
  insertTOCBefore?: (segment: string) => React.ReactNode,
) => {
  const regex = /\[caption\]([\s\S]*?)\[\/caption\]/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let tocInserted = !insertTOCBefore;
  let key = 0;
  while ((match = regex.exec(html)) !== null) {
    const before = html.substring(lastIndex, match.index);
    if (before) {
      if (!tocInserted) {
        parts.push(<Fragment key={key++}>{insertTOCBefore!(before)}</Fragment>);
        tocInserted = true;
      } else {
        parts.push(<div key={key++} className={proseClasses} dangerouslySetInnerHTML={{ __html: before }} />);
      }
    }
    // Strip HTML tags from caption text to get clean quote
    const captionText = match[1].replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n\n").replace(/<[^>]*>/g, "").trim();
    parts.push(<CaptionCard key={key++} text={captionText} shareUrl={shareUrl} />);
    lastIndex = regex.lastIndex;
  }
  const remaining = html.substring(lastIndex);
  if (remaining) {
    if (!tocInserted) {
      parts.push(<Fragment key={key++}>{insertTOCBefore!(remaining)}</Fragment>);
    } else {
      parts.push(<div key={key++} className={proseClasses} dangerouslySetInnerHTML={{ __html: remaining }} />);
    }
  }
  return parts;
};

const extractHeadings = (html: string) => {
  const regex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    const id = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
    headings.push({ level: parseInt(match[1]), text, id });
  }
  return headings;
};

const addHeadingIds = (html: string) => {
  return html.replace(/<h([2-3])([^>]*)>(.*?)<\/h[2-3]>/gi, (_, level, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, "").trim();
    const id = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
};

const TableOfContents = ({ content }: { content: string }) => {
  const [open, setOpen] = useState(false);
  const headings = useMemo(() => extractHeadings(content), [content]);
  if (headings.length < 2) return null;
  return (
    <div className="mb-6 sm:mb-8 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-muted/30 to-background overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold text-foreground hover:bg-primary/5 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <List size={15} className="text-primary" />
          </span>
          <span>Table of Contents</span>
          <span className="text-[10px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded-full">{headings.length}</span>
        </span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <nav className="px-4 sm:px-5 pb-4 pt-1 border-t border-primary/10">
          <ul className="space-y-0.5">
            {headings.map((h, i) => (
              <li key={i}>
                <a
                  href={`#${h.id}`}
                  className={`flex items-center gap-2 py-1.5 sm:py-2 text-[13px] sm:text-sm text-muted-foreground hover:text-primary transition-colors leading-snug rounded-lg hover:bg-primary/5 px-2.5 -mx-1 ${h.level === 3 ? "pl-7 sm:pl-8" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.level === 2 ? "bg-primary/60" : "bg-muted-foreground/30"}`} />
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

const BlogDetail = () => {
  const { slug } = useParams();
  const { settings } = useSiteSettings();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Related posts
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["related-blogs", post?.category, post?.id],
    queryFn: async () => {
      let query = supabase
        .from("blogs")
        .select("id, title, slug, image_url, published_at, created_at, category, excerpt")
        .eq("is_published", true)
        .neq("id", post!.id)
        .order("published_at", { ascending: false })
        .limit(3);
      if (post?.category) {
        query = query.eq("category", post.category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!post,
  });

  const siteName = settings.site_title || "Pikooly";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://pikooly.com.bd";
  const seoTitle = post ? (post.seo_title || `${post.title} - ${siteName}`) : siteName;
  const seoDesc = post ? (post.seo_description || post.excerpt || "") : "";

  const estimateReadTime = (content: string | null) => {
    if (!content) return "2 min read";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.round(words / 200))} min read`;
  };

  const articleJsonLd = useMemo(() => {
    if (!post) return undefined;
    const breadcrumbs: any[] = [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
    ];
    if (post.category) {
      breadcrumbs.push({
        "@type": "ListItem",
        position: 3,
        name: post.category,
        item: `${siteUrl}/blog/category/${slugify(post.category)}`,
      });
    }
    breadcrumbs.push({
      "@type": "ListItem",
      position: post.category ? 4 : 3,
      name: post.title,
      item: `${siteUrl}/blog/${post.slug}`,
    });
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt || "",
          image: post.image_url || "",
          url: `${siteUrl}/blog/${post.slug}`,
          datePublished: post.published_at || post.created_at,
          dateModified: post.updated_at,
          publisher: { "@type": "Organization", name: siteName },
          author: { "@type": "Organization", name: siteName },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs,
        },
      ],
    };
  }, [post, siteName, siteUrl]);

  if (isLoading) {
    return (
      <main className="section-container py-6 md:py-10 pb-6 md:pb-10">
        <Skeleton className="h-6 w-24 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        <Skeleton className="aspect-[16/9] w-full rounded-2xl mb-8" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="section-container py-20 text-center pb-6 md:pb-10">
        <p className="text-muted-foreground mb-4">Blog post not found.</p>
        <Link to="/blog" className="text-primary text-sm font-medium hover:underline">
          ← Back to Blog
        </Link>
      </main>
    );
  }

  const publishedDate = new Date(post.published_at || post.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const shareUrl = `${siteUrl}/blog/${post.slug}`;
  const shareLinks = [
    { label: "Facebook", icon: "F", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { label: "Twitter", icon: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}` },
    { label: "WhatsApp", icon: "W", href: `https://wa.me/?text=${encodeURIComponent(post.title + " " + shareUrl)}` },
    { label: "LinkedIn", icon: "in", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
  ];

  return (
    <main className="pb-6 md:pb-10">
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        canonical={shareUrl}
        ogImage={post.image_url || ""}
        ogType="article"
        jsonLd={articleJsonLd}
      />


      <article className="section-container">
        <div className="py-6 sm:py-8 md:py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
         <div className="max-w-3xl mx-auto lg:mx-0 w-full min-w-0">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-5"
          >
            <ArrowLeft size={14} />
            Back to Blog
          </Link>

          {/* Title */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground mb-3">
            {post.category && (
              <Link
                to={`/blog/category/${slugify(post.category)}`}
                className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium hover:bg-primary/20 transition-colors"
              >
                {post.category}
              </Link>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              <time>{publishedDate}</time>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {estimateReadTime(post.content)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground leading-tight mb-6">
            {post.title}
          </h1>

          {/* AdSense — Top banner under title */}
          <AdSlot placement="blog_detail_top" slot={settings.adsense_blog_detail_top_slot} sizeVariant="leaderboard-box" />

          {/* Cover image inside article */}
          {post.image_url && (
            <figure className="mb-6 sm:mb-8 -mx-4 sm:mx-0">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full aspect-[16/9] sm:rounded-2xl shadow-md object-cover max-h-[500px]"
                loading="eager"
              />
            </figure>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <div className="bg-primary/5 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 border-l-4 border-primary">
              <p className="text-sm sm:text-base text-foreground/80 leading-relaxed italic">
                {post.excerpt}
              </p>
            </div>
          )}

          {/* Content with TOC inserted before first H2, and [caption]...[/caption] rendered as share cards */}
          {(() => {
            const fullHtml = addHeadingIds(post.content || "");
            const proseClasses = "prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-headings:font-semibold prose-p:text-muted-foreground prose-p:leading-[1.8] prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-md prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-li:text-muted-foreground prose-strong:text-foreground rich-text-content";

            const insertTOC = (segment: string) => {
              const firstH2 = segment.search(/<h2[\s>]/i);
              if (firstH2 > 0) {
                return (
                  <>
                    <div className={proseClasses} dangerouslySetInnerHTML={{ __html: segment.substring(0, firstH2) }} />
                    <TableOfContents content={post.content || ""} />
                    {/* AdSense — In-article (between intro and main content) */}
                    <AdSlot placement="blog_detail_inarticle" slot={settings.adsense_blog_detail_inarticle_slot} sizeVariant="leaderboard-box" />
                    <div className={proseClasses} dangerouslySetInnerHTML={{ __html: segment.substring(firstH2) }} />
                  </>
                );
              }
              return (
                <>
                  <TableOfContents content={post.content || ""} />
                  {/* AdSense — In-article fallback */}
                  <AdSlot placement="blog_detail_inarticle" slot={settings.adsense_blog_detail_inarticle_slot} sizeVariant="leaderboard-box" />
                  <div className={proseClasses} dangerouslySetInnerHTML={{ __html: segment }} />
                </>
              );
            };

            return <>{renderContentWithCaptions(fullHtml, proseClasses, shareUrl, insertTOC)}</>;
          })()}

          {/* Share Section */}
          <div className="mt-10 sm:mt-14 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Share2 size={16} /> Share this article
              </p>
              <div className="flex items-center gap-2">
                {shareLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-muted-foreground transition-all duration-200 text-xs font-bold"
                    aria-label={`Share on ${s.label}`}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
         </div>
         <div className="mt-8 lg:mt-0">
           <BlogGiftSidebar category={post.category} giftCategoryIds={(post as any).gift_category_ids} />
         </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-muted/30 py-8 md:py-12">
          <div className="section-container">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-5">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {relatedPosts.map((rp: any) => (
                <Link
                  key={rp.id}
                  to={`/blog/${rp.slug}`}
                  className="group bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={rp.image_url || "/placeholder.svg"}
                      alt={rp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                      {rp.category && (
                        <Link
                          to={`/blog/category/${slugify(rp.category)}`}
                          className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium hover:bg-primary/20 transition-colors"
                        >
                          {rp.category}
                        </Link>
                      )}
                      <time>{new Date(rp.published_at || rp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
                    </div>
                    <h3 className="font-display font-semibold text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {rp.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default BlogDetail;
