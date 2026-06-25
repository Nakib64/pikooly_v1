// Extract FAQ-style Q&A pairs from blog post HTML content.
// Looks for headings (h2/h3/h4/strong) ending with "?" and uses the
// following paragraph/list as the answer.

export interface FaqItem {
  question: string;
  answer: string;
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

export function extractFaqsFromHtml(html: string | null | undefined, max = 8): FaqItem[] {
  if (!html) return [];
  const faqs: FaqItem[] = [];

  // Match headings or <strong> that end with "?" then capture following content
  // up to the next heading.
  const regex =
    /<(h[2-4]|strong|p)[^>]*>([\s\S]*?\?)\s*<\/\1>([\s\S]*?)(?=<(?:h[2-4]|strong)[^>]*>|$)/gi;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) && faqs.length < max) {
    const question = stripHtml(m[2]);
    const answer = stripHtml(m[3]);
    if (question.length < 8 || question.length > 200) continue;
    if (!answer || answer.length < 20) continue;
    // Skip duplicates
    if (faqs.some((f) => f.question.toLowerCase() === question.toLowerCase())) continue;
    faqs.push({ question, answer: answer.slice(0, 500) });
  }
  return faqs;
}
