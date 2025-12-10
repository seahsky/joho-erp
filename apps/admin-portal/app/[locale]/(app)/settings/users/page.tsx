'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@joho-erp/ui';
import { Users, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function UserManagementSettingsPage() {
  const t = useTranslations('settings.users');

  // Mock data to show the UI structure
  const mockUsers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      lastActive: '2025-01-15',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'sales',
      status: 'active',
      lastActive: '2025-01-14',
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'driver',
      status: 'inactive',
      lastActive: '2024-12-20',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-muted-foreground" />
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Implementation Required Notice */}
      <Card className="mb-6 border-warning bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-semibold text-warning">{t('clerkRequired.title')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('clerkRequired.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List Preview (Placeholder UI) */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>{t('userList.title')}</CardTitle>
          <CardDescription>{t('userList.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Overlay to indicate disabled state */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
              <p className="text-sm font-medium text-muted-foreground bg-background px-4 py-2 rounded-lg border">
                {t('clerkRequired.requiresImplementation')}
              </p>
            </div>

            {/* Table structure (disabled) */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('userList.name')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('userList.email')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('userList.role')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('userList.status')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('userList.lastActive')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">{t('userList.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="capitalize">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status === 'active' ? t('userList.active') : t('userList.inactive')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.lastActive}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button className="text-xs text-primary hover:underline" disabled>
                            {t('userList.edit')}
                          </button>
                          <button className="text-xs text-destructive hover:underline" disabled>
                            {t('userList.deactivate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles & Permissions Preview */}
      <Card className="mt-6 animate-fade-in-up delay-100">
        <CardHeader>
          <CardTitle>{t('roles.title')}</CardTitle>
          <CardDescription>{t('roles.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Overlay to indicate disabled state */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
              <p className="text-sm font-medium text-muted-foreground bg-background px-4 py-2 rounded-lg border">
                {t('clerkRequired.requiresImplementation')}
              </p>
            </div>

            {/* Roles grid (disabled) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'Admin', permissions: ['Full access'], count: 1 },
                { name: 'Sales', permissions: ['Orders', 'Customers'], count: 1 },
                { name: 'Driver', permissions: ['Deliveries'], count: 1 },
                { name: 'Viewer', permissions: ['Read-only'], count: 0 },
              ].map((role) => (
                <div key={role.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{role.name}</p>
                    <Badge variant="secondary">{role.count}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {role.permissions.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
