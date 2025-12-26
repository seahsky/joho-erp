'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input, Label } from '@joho-erp/ui';
import { ChevronDown, Plus, Check, X, Loader2 } from 'lucide-react';

export type Category = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  categories: Category[];
  onCreateCategory?: (name: string) => Promise<Category>;
  isCreating?: boolean;
  disabled?: boolean;
  labels: {
    selectCategory: string;
    createCategory: string;
    searchPlaceholder: string;
    noCategories: string;
    newCategoryName: string;
    creating: string;
  };
}

export function CategorySelect({
  value,
  onChange,
  categories,
  onCreateCategory,
  isCreating = false,
  disabled = false,
  labels,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
        setNewCategoryName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when adding new category
  useEffect(() => {
    if (isAddingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingNew]);

  const selectedCategory = categories.find((c) => c.id === value);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateNew = async () => {
    if (!newCategoryName.trim() || !onCreateCategory) return;

    try {
      const newCategory = await onCreateCategory(newCategoryName.trim());
      onChange(newCategory.id);
      setIsAddingNew(false);
      setNewCategoryName('');
      setIsOpen(false);
    } catch {
      // Error handling is done in parent component via toast
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateNew();
    } else if (e.key === 'Escape') {
      setIsAddingNew(false);
      setNewCategoryName('');
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedCategory ? '' : 'text-muted-foreground'}>
          {selectedCategory?.name || labels.selectCategory}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search input */}
          <div className="p-2 border-b">
            <Input
              placeholder={labels.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>

          {/* Category list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {labels.noCategories}
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span>{category.name}</span>
                  {category.id === value && <Check className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>

          {/* Add new category section */}
          {onCreateCategory && (
            <div className="border-t p-2">
              {isAddingNew ? (
                <div className="space-y-2">
                  <Label className="text-xs">{labels.newCategoryName}</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={labels.newCategoryName}
                      className="h-8 flex-1"
                      disabled={isCreating}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateNew}
                      disabled={!newCategoryName.trim() || isCreating}
                      className="h-8"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewCategoryName('');
                      }}
                      disabled={isCreating}
                      className="h-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingNew(true)}
                  className="w-full justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {labels.createCategory}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
