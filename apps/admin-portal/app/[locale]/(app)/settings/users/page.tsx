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
  Label,
  Skeleton,
  useToast,
  Badge,
  StatusBadge,
  type StatusType,
} from '@joho-erp/ui';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Clock,
  X,
  Loader2,
  CheckCircle,
  Mail,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';

type Role = 'admin' | 'sales' | 'manager' | 'packer' | 'driver';

export default function UserManagementSettingsPage() {
  const t = useTranslations('settings.users');
  const { toast } = useToast();
  const utils = api.useUtils();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    status: string;
  } | null>(null);

  // Invite form state
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'sales' as Role,
  });

  // API queries
  const {
    data: users,
    isLoading,
  } = api.user.getAll.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: pendingInvitations } = api.user.getPendingInvitations.useQuery();

  // Mutations
  const inviteMutation = api.user.invite.useMutation({
    onSuccess: () => {
      toast({ title: t('inviteSuccess'), variant: 'default' });
      setIsInviteDialogOpen(false);
      setInviteData({ email: '', firstName: '', lastName: '', role: 'sales' });
      void utils.user.getAll.invalidate();
      void utils.user.getPendingInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('inviteError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = api.user.updateRole.useMutation({
    onSuccess: () => {
      toast({ title: t('userUpdated'), variant: 'default' });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      void utils.user.getAll.invalidate();
      void utils.user.getPendingInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('updateError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deactivateMutation = api.user.deactivate.useMutation({
    onSuccess: () => {
      toast({ title: t('userDeactivated'), variant: 'default' });
      setIsDeactivateDialogOpen(false);
      setSelectedUser(null);
      void utils.user.getAll.invalidate();
      void utils.user.getPendingInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('deactivateError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const revokeInvitationMutation = api.user.revokeInvitation.useMutation({
    onSuccess: () => {
      toast({ title: t('invitationRevoked'), variant: 'default' });
      void utils.user.getAll.invalidate();
      void utils.user.getPendingInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('revokeError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter users by search
  const filteredUsers = users?.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query)
    );
  });

  // Role badge colors
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'sales':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'packer':
        return 'outline';
      case 'driver':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Handlers
  const handleInvite = () => {
    if (!inviteData.email || !inviteData.firstName || !inviteData.lastName) {
      toast({ title: t('validationError'), variant: 'destructive' });
      return;
    }
    inviteMutation.mutate(inviteData);
  };

  const handleUpdateRole = () => {
    if (!selectedUser) return;
    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: selectedUser.role as Role,
    });
  };

  const handleDeactivate = () => {
    if (!selectedUser) return;
    const shouldDeactivate = selectedUser.status !== 'banned';
    deactivateMutation.mutate({
      userId: selectedUser.id,
      deactivate: shouldDeactivate,
    });
  };

  // Stats
  const stats = {
    total: users?.length || 0,
    active: users?.filter((u) => u.status === 'active').length || 0,
    pending: pendingInvitations?.length || 0,
    admins: users?.filter((u) => u.role === 'admin').length || 0,
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={Users}
        titleKey="users.title"
        descriptionKey="users.subtitle"
      >
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('addUser')}
        </Button>
      </SettingsPageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activeUsers')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.pendingInvites')}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.administrators')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('userList')}</CardTitle>
          <CardDescription>{t('userListDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('name')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('email')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('role')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('status')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('lastActive')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.imageUrl ? (
                            <Image
                              src={user.imageUrl}
                              alt=""
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {user.firstName?.[0] || user.email[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="font-medium">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.email.split('@')[0]}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                          {t(`roles.${user.role}`)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={user.status as StatusType} /></td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {user.lastSignInAt
                          ? new Date(user.lastSignInAt).toLocaleDateString()
                          : t('neverSignedIn')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser({
                                id: user.id,
                                email: user.email,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                role: user.role,
                                status: user.status,
                              });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            {t('editRole')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={user.status === 'banned' ? 'text-green-600' : 'text-destructive'}
                            onClick={() => {
                              setSelectedUser({
                                id: user.id,
                                email: user.email,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                role: user.role,
                                status: user.status,
                              });
                              setIsDeactivateDialogOpen(true);
                            }}
                          >
                            {user.status === 'banned' ? t('reactivate') : t('deactivate')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">{t('noUsers')}</p>
              <p className="text-muted-foreground">{t('noUsersDescription')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('pendingInvitations')}</CardTitle>
            <CardDescription>{t('pendingInvitationsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('invitedAs')}{' '}
                      <span className="capitalize">{t(`roles.${invitation.role}`)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {t('pendingStatus')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => revokeInvitationMutation.mutate({ invitationId: invitation.id })}
                    >
                      {t('revoke')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite User Dialog */}
      {isInviteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{t('addUserDialog.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('addUserDialog.description')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInviteDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('addUserDialog.firstName')}</Label>
                  <Input
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                    placeholder={t('addUserDialog.firstNamePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('addUserDialog.lastName')}</Label>
                  <Input
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                    placeholder={t('addUserDialog.lastNamePlaceholder')}
                  />
                </div>
              </div>
              <div>
                <Label>{t('addUserDialog.email')}</Label>
                <Input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder={t('addUserDialog.emailPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('addUserDialog.role')}</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as Role })}
                >
                  <option value="admin">{t('roles.admin')}</option>
                  <option value="sales">{t('roles.sales')}</option>
                  <option value="manager">{t('roles.manager')}</option>
                  <option value="packer">{t('roles.packer')}</option>
                  <option value="driver">{t('roles.driver')}</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(`roleDescriptions.${inviteData.role}`)}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                {t('addUserDialog.cancel')}
              </Button>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('addUserDialog.creating')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t('addUserDialog.sendInvite')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Dialog */}
      {isEditDialogOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{t('editUserDialog.title')}</h2>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsEditDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <Label>{t('addUserDialog.role')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md mt-1"
                value={selectedUser.role}
                onChange={(e) =>
                  setSelectedUser({ ...selectedUser, role: e.target.value })
                }
              >
                <option value="admin">{t('roles.admin')}</option>
                <option value="sales">{t('roles.sales')}</option>
                <option value="manager">{t('roles.manager')}</option>
                <option value="packer">{t('roles.packer')}</option>
                <option value="driver">{t('roles.driver')}</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t(`roleDescriptions.${selectedUser.role}`)}
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('addUserDialog.cancel')}
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('editUserDialog.updating')}
                  </>
                ) : (
                  t('editUserDialog.updateUser')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      {isDeactivateDialogOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold">
                {selectedUser.status === 'banned' ? t('reactivateDialog.title') : t('deactivateDialog.title')}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedUser.status === 'banned'
                  ? t('reactivateDialog.description')
                  : t('deactivateDialog.description')}
              </p>
              <p className="font-medium mt-4">{selectedUser.email}</p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>
                {t('deactivateDialog.cancel')}
              </Button>
              <Button
                variant={selectedUser.status === 'banned' ? 'default' : 'destructive'}
                onClick={handleDeactivate}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('deactivateDialog.processing')}
                  </>
                ) : selectedUser.status === 'banned' ? (
                  t('reactivateDialog.reactivate')
                ) : (
                  t('deactivateDialog.deactivate')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
