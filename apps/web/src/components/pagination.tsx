'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
      <div className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-900">{from}</span> to{' '}
        <span className="font-medium text-slate-900">{to}</span> of{' '}
        <span className="font-medium text-slate-900">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-2.5 py-1.5 rounded-md text-sm border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-slate-700 px-3 font-mono">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-2.5 py-1.5 rounded-md text-sm border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
