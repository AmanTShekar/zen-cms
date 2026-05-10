import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Users, UserPlus, Mail, Shield, Trash2, Search } from 'lucide-react';
import api from '../lib/api';

const UsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/system/users${search ? `?search=${search}` : ''}`);
      setUsers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/system/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
            <p className="text-text-secondary mt-1">Manage administrative access and permissions</p>
          </div>
          <button className="btn btn-primary flex items-center gap-2">
            <UserPlus size={18} />
            Invite User
          </button>
        </div>

        <div className="flex items-center gap-4 p-4 bg-app-surface border border-border rounded-lg">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search users by email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent pl-10 pr-4 py-1 text-sm outline-none"
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Last Login</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-text-muted">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-text-muted">No users found</td></tr>
              ) : (
                users.filter(u => u.email.includes(search) || u.role.includes(search)).map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 text-accent rounded-full flex items-center justify-center font-bold text-xs">
                          {user.email[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{user.email}</span>
                          <span className="text-[10px] text-text-muted">ID: {user._id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className={user.role === 'admin' ? 'text-accent' : 'text-text-muted'} />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                          user.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-app-subtle text-text-secondary'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-text-secondary">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button 
                        onClick={() => handleDelete(user._id)}
                        className="p-2 hover:bg-danger/10 hover:text-danger rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;
