'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Checkbox,
} from '@joho-erp/ui';
import { Loader2 } from 'lucide-react';
import { api } from '@/trpc/client';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';

type Category = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
};

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSuccess: () => void;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: EditCategoryDialogProps) {
  const { toast } = useToast();
  const t = useTranslations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Clear individual field error
  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  // Update form when category changes
  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setIsActive(category.isActive);
      setFieldErrors({});
    }
  }, [category]);

  const updateMutation = api.category.update.useMutation({
    onSuccess: () => {
      toast({
        title: t('categories.messages.updated'),
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t('categories.messages.updateError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!name?.trim()) {
      errors.name = t('categories.validation.nameRequired');
      isValid = false;
    } else if (name.length > 50) {
      errors.name = t('categories.validation.nameTooLong');
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) return;

    if (!validateForm()) {
      toast({
        title: t('validation.invalidInput'),
        description: t('validation.fixErrors'),
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({
      id: category.id,
      name: name.trim(),
      description: description.trim() || undefined,
      isActive,
    });
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('categories.dialog.editTitle')}</DialogTitle>
          <DialogDescription>
            {t('categories.dialog.editDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('categories.fields.nameRequired')}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              placeholder={t('categories.fields.namePlaceholder')}
              maxLength={50}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">{t('categories.fields.description')}</Label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder={t('categories.fields.descriptionPlaceholder')}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-active"
              checked={isActive}
              onCheckedChange={(checked: boolean) => setIsActive(checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="edit-active" className="cursor-pointer">{t('categories.fields.active')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('categories.fields.activeDescription')}
              </p>
            </div>
          </div>

          {category.productCount > 0 && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {t('categories.info.hasProducts', { count: category.productCount })}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !name.trim()}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.saveChanges')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
