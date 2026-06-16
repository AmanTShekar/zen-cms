import React from 'react'
import { useConfirmStore } from '../store/confirmStore'
import { ConfirmDialog } from '../pages/editor/components/ConfirmDialog'
import { useShallow } from 'zustand/react/shallow'

export const GlobalConfirmDialog: React.FC = () => {
 const { isOpen, title, message, confirmText, variant, close  } = useConfirmStore(useShallow(state => ({ isOpen: state.isOpen, title: state.title, message: state.message, confirmText: state.confirmText, variant: state.variant, close: state.close })))

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
