import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents = {
  h1: ({ children, ...props }) => (
    <h1 className="text-2xl font-bold tracking-tight mt-6 first:mt-0 text-foreground border-b border-border pb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-semibold mt-6 first:mt-0 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-medium mt-4 text-foreground" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="text-sm leading-relaxed text-foreground/90 mt-3 first:mt-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-5 mt-2 space-y-1.5 text-sm text-foreground/90" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-5 mt-2 space-y-1.5 text-sm text-foreground/90" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-foreground/95" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-primary/50 bg-muted/40 pl-4 py-2 pr-2 rounded-r-md text-sm text-muted-foreground my-4"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-6 border-border" {...props} />,
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4 rounded-md border border-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => <thead className="bg-muted/80" {...props}>{children}</thead>,
  th: ({ children, ...props }) => (
    <th className="text-left p-2 font-medium border-b border-border" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="p-2 border-b border-border/60 align-top" {...props}>
      {children}
    </td>
  ),
  a: ({ children, ...props }) => (
    <a className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};

/** Renders AI health report markdown with PayPill typography (no raw \\n or bare ** in UI). */
export default function HealthReportMarkdown({ markdown }) {
  if (!markdown || typeof markdown !== 'string') {
    return <p className="text-sm text-muted-foreground">No report content.</p>;
  }

  return (
    <div className="health-report-md max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
