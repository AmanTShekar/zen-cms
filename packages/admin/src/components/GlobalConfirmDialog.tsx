import React from 'react'
import { useConfirmStore } from '../store/confirmStore'
import { ConfirmDialog } from '../pages/editor/components/ConfirmDialog'

export const GlobalConfirmDialog: React.FC = () => {
 const { isOpen, title, message, confirmText, variant, close } = useConfirmStore()

 return (
 <ConfirmDialog
 open={isOpen}
 title={title}
 message={message}
 confirmLabel={confirmText}
 danger={variant === 'danger'}
 onConfirm={() => close(true)}
 onCancel={() => close(false)}
 />
 )
}
