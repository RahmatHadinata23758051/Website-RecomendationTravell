import React from 'react';
import {
  LayoutGrid,
  Palmtree,
  Mountain,
  Landmark,
  Utensils,
  Footprints,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryOption {
  name: string;
  label: string;
  icon: LucideIcon;
}

export const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = [
  { name: 'Semua', label: 'Semua', icon: LayoutGrid },
  { name: 'Pantai', label: 'Pantai', icon: Palmtree },
  { name: 'Alam', label: 'Alam', icon: Mountain },
  { name: 'Budaya', label: 'Budaya', icon: Landmark },
  { name: 'Kuliner', label: 'Kuliner', icon: Utensils },
  { name: 'Adventure', label: 'Adventure', icon: Footprints },
];

export interface CategoryPillsProps {
  /**
   * For single-select mode (e.g., ExplorePage, HomePage, FavoritesPage).
   */
  selected?: string;
  onSelect?: (category: string) => void;

  /**
   * For multi-select mode (e.g., PlannerPage).
   */
  selectedList?: string[];
  onToggle?: (category: string) => void;

  categories?: CategoryOption[];
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Functional category filters without AI slop sparkles.
 * Complies with WCAG touch targets (min 44px height) and visible focus rings.
 */
export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selected,
  onSelect,
  selectedList,
  onToggle,
  categories = DEFAULT_CATEGORY_OPTIONS,
  className = '',
  size = 'md',
}) => {
  const isMulti = Array.isArray(selectedList) && typeof onToggle === 'function';

  return (
    <div
      role="group"
      aria-label="Filter kategori destinasi"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isSelected = isMulti
          ? selectedList.includes(cat.name)
          : selected === cat.name;

        const handleClick = () => {
          if (isMulti) {
            onToggle(cat.name);
          } else if (onSelect) {
            onSelect(cat.name);
          }
        };

        const sizeClasses =
          size === 'sm'
            ? 'min-h-[40px] px-3.5 py-1.5 text-xs'
            : 'min-h-[44px] px-4 py-2 text-xs sm:text-sm';

        return (
          <button
            key={cat.name}
            type="button"
            onClick={handleClick}
            aria-pressed={isSelected}
            className={`inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${sizeClasses} ${
              isSelected
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <Icon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 ${
                isSelected ? 'text-white' : 'text-slate-500'
              }`}
            />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};
