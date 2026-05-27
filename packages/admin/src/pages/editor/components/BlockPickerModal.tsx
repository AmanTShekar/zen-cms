/**
 * BlockPickerModal — thin wrapper that keeps the `blockPickerOpen` Zustand
 * toggle working while delegating all UI to the global GlobalComponentPickerModal.
 *
 * When `blockPickerOpen` becomes true (keyboard "/" shortcut, toolbar button,
 * or the between-block "Insert" portal), we immediately open the global
 * picker with the `addBlock` callback, then clear `blockPickerOpen` so the
 * two flags don't stay out of sync.
 */
import React, { useEffect } from 'react'
import { useModalStore } from '../../../store/modalStore'

interface BlockPickerModalProps {
  addBlock: (blockType: string) => void
}

export const BlockPickerModal: React.FC<BlockPickerModalProps> = ({ addBlock }) => {
  const { blockPickerOpen, setBlockPickerOpen, openComponentPicker } = useModalStore()

  useEffect(() => {
    if (blockPickerOpen) {
      // Hand off to the global picker, then clear the local flag
      openComponentPicker((blockType) => {
        addBlock(blockType)
      })
      setBlockPickerOpen(false)
    }
  }, [blockPickerOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
