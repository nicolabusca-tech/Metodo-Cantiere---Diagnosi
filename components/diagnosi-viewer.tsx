'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DiagnosiViewerProps {
  content: string
  className?: string
}

export function DiagnosiViewer({ content, className = '' }: DiagnosiViewerProps) {
  return (
    <article
      className={`prose prose-neutral max-w-none
        prose-headings:text-neutral-900 prose-headings:font-bold
        prose-h1:text-3xl prose-h1:border-b prose-h1:border-neutral-200 prose-h1:pb-3 prose-h1:mb-6
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-neutral-700 prose-p:leading-relaxed
        prose-li:text-neutral-700
        prose-strong:text-neutral-900
        prose-blockquote:border-primary prose-blockquote:bg-neutral-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
        prose-table:border-collapse
        prose-th:bg-neutral-100 prose-th:text-left prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-neutral-200
        prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-neutral-200
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
