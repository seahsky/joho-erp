'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  ResponsiveTable,
  type TableColumn,
  Badge,
  EmptyState,
  TableSkeleton,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  StatusBadge,
  type StatusType,
} from '@joho-erp/ui';
import { Search, FolderTree, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '@/trpc/client';
import { useTranslations } from 'next-intl';
import { useToast } from '@joho-erp/ui';
import { PermissionGate } from '@/components/permission-gate';
import { AddCategoryDialog } from './AddCategoryDialog';
import { EditCategoryDialog } from './EditCategoryDialog';

type Category = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  processingLossPercentage: number | null;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function CategoriesTab() {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const { data: categoriesData, isLoading, refetch } = api.category.getAllWithProductCount.useQuery();

  const deleteMutation = api.category.delete.useMutation({
    onSuccess: (result) => {
      if (result.deactivated) {
        toast({
          title: t('messages.deactivated'),
          description: t('messages.deactivatedDescription'),
        });
      } else {
        toast({
          title: t('messages.deleted'),
        });
      }
      refetch();
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast({
        title: t('messages.deleteError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const categories = (categoriesData ?? []) as Category[];

  // Filter categories by search
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const activeCount = categories.filter((c) => c.isActive).length;
  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);

  // Helper to convert boolean to status type
  const getStatusFromActive = (isActive: boolean): StatusType => isActive ? 'active' : 'inactive';

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate({ id: categoryToDelete.id });
    }
  };

  const columns: TableColumn<Category>[] = [
    {
      key: 'name',
      label: t('fields.name'),
      className: 'font-medium',
    },
    {
      key: 'description',
      label: t('fields.description'),
      render: (category) => category.description || '-',
    },
    {
      key: 'productCount',
      label: t('fields.productCount'),
      render: (category) => (
        <Badge variant="outline">{category.productCount}</Badge>
      ),
    },
    {
      key: 'isActive',
      label: tCommon('status'),
      render: (category) => <StatusBadge status={getStatusFromActive(category.isActive)} showIcon={false} />,
    },
    {
      key: 'actions',
      label: tCommon('actions'),
      className: 'text-right',
      render: (category) => (
        <div className="flex justify-end gap-2">
          <PermissionGate permission="products:edit">
            <Button
              variant="ghost"
              size="sm"
              aria-label={tCommon('edit')}
              onClick={() => {
                setSelectedCategory(category);
                setShowEditDialog(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </PermissionGate>
          <PermissionGate permission="products:edit">
            <Button
              variant="ghost"
              size="sm"
              aria-label={tCommon('delete')}
              onClick={() => handleDelete(category)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  const mobileCard = (category: Category) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
        <StatusBadge status={getStatusFromActive(category.isActive)} showIcon={false} />
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">{t('fields.productCount')}: </span>
          <span className="font-medium">{category.productCount}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <PermissionGate permission="products:edit">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setSelectedCategory(category);
              setShowEditDialog(true);
            }}
          >
            <Edit className="h-4 w-4 mr-1" />
            {tCommon('edit')}
          </Button>
        </PermissionGate>
        <PermissionGate permission="products:edit">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive"
            onClick={() => handleDelete(category)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {tCommon('delete')}
          </Button>
        </PermissionGate>
      </div>
    </div>
  );

  return (
    <>
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Card className="stat-card animate-fade-in-up">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('stats.total')}</CardDescription>
            <div className="stat-value tabular-nums">{categories.length}</div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-100">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('stats.active')}</CardDescription>
            <div className="stat-value tabular-nums text-success">{activeCount}</div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-200">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('stats.productsAssigned')}</CardDescription>
            <div className="stat-value tabular-nums">{totalProducts}</div>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Add Button */}
      <Card className="mb-6">
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <PermissionGate permission="products:create">
              <Button
                className="btn-enhanced btn-primary-enhanced"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('buttons.add')}
              </Button>
            </PermissionGate>
          </div>
        </CardHeader>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              {t('listTitle')}
            </div>
          </CardTitle>
          <CardDescription>{t('listDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : filteredCategories.length > 0 ? (
            <ResponsiveTable
              data={filteredCategories}
              columns={columns}
              mobileCard={mobileCard}
              className="md:border-0"
            />
          ) : (
            <EmptyState
              icon={FolderTree}
              title={t('noCategories')}
              description={searchQuery ? t('adjustSearch') : t('addFirst')}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => refetch()}
      />

      {/* Edit Category Dialog */}
      <EditCategoryDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete?.productCount && categoryToDelete.productCount > 0
                ? t('deleteDialog.hasProducts', { count: categoryToDelete.productCount })
                : t('deleteDialog.confirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {categoryToDelete?.productCount && categoryToDelete.productCount > 0
                ? t('buttons.deactivate')
                : tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
