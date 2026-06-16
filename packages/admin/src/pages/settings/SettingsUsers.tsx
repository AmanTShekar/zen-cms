import React, { useState } from 'react'
import { Users, Trash2, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import InviteUserModal from './InviteUserModal'

interface User {
 _id: string
 email: string
 role: string
 [key: string]: any
}

interface SettingsUsersProps {
 users: User[]
 theme: 'light' | 'dark'
 fetchData: () => void
}

const SettingsUsers: React.FC<SettingsUsersProps> = ({ users, theme, fetchData }) => {
 const [inviteOpen, setInviteOpen] = useState(false)
 const [deletingId, setDeletingId] = useState<string | null>(null)

 const handleDeleteUser = async (id: string) => {
 setDeletingId(id)
 try {
 await api.delete(`/system/users/${id}`)
 toast.success('Operator removed')
 fetchData()
 } catch (err: any) {
 toast.error(err?.response?.data?.error || 'Failed to remove operator')
 } finally {
 setDeletingId(null)
 }
 }

 return (
 <>
 <div className="col-span-full space-y-4">
 <div className="flex items-center justify-between mb-4 px-2">
 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 dark:text-gray-500">
 {users.length} Active Operators
 </span>
 <button
 onClick={() => setInviteOpen(true)}
 className="text-[10px] font-black uppercase border border-white/[0.08] px-8 py-3 rounded-none-none hover:bg-white/5 transition-all"
 >
 Add Operator
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {users.map((user) => (
 <div
 key={user._id}
 className={cn(
 'flex items-center justify-between p-4 border rounded-none-none transition-all group',
 theme === 'dark'
 ? 'bg-black/40 border-white/[0.08] hover:border-red-500/10'
 : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-none-none bg-gray-500/10 flex items-center justify-center text-gray-600 dark:text-gray-500 border border-gray-500/20">
 <Users size={20} />
 </div>
 <div className="flex flex-col leading-none">
 <span className="text-[12px] font-black uppercase leading-none">
 {user.email}
 </span>
 <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 opacity-60">
 Auth Tier: {user.role}
 </span>
 </div>
 </div>
 <button
 onClick={() => handleDeleteUser(user._id)}
 disabled={deletingId === user._id}
 className="p-3 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
 title="Remove operator"
 >
 {deletingId === user._id ? (
 <Loader2 size={16} className="animate-spin" />
 ) : (
 <Trash2 size={16} />
 )}
 </button>
 </div>
 ))}
 </div>
 </div>

 {inviteOpen && (
 <InviteUserModal
 onClose={() => setInviteOpen(false)}
 onInvited={fetchData}
 theme={theme}
 />
 )}
 </>
 )
}

export default SettingsUsers
