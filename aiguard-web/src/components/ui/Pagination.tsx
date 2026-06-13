import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<Props> = ({ page, totalPages, totalCount, pageSize, onPageChange }) => {
  const { t, locale } = useLanguage();
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="pagination-container">
      <span className="pagination-info">
        {t('Showing', 'Hiển thị')} {start.toLocaleString(locale)}-{end.toLocaleString(locale)} {t('of', 'trên')} {totalCount.toLocaleString(locale)}
      </span>
      <div className="pagination-buttons">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title={t('Previous page', 'Trang trước')}
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
          let pageNumber: number;
          if (totalPages <= 5) pageNumber = index + 1;
          else if (page <= 3) pageNumber = index + 1;
          else if (page >= totalPages - 2) pageNumber = totalPages - 4 + index;
          else pageNumber = page - 2 + index;

          return (
            <button
              key={pageNumber}
              className={`pagination-btn ${pageNumber === page ? 'active' : ''}`}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </button>
          );
        })}
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title={t('Next page', 'Trang sau')}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
