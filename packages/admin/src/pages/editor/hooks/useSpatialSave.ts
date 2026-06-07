import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { useEditorStore } from '../../../store/editorStore'
import { useWorkflowStore } from '../../../store/workflowStore'
import type { PageData, Section } from '../constants'
import { uid } from '../../../lib/utils'

export function useSpatialSave({
  isGlobal,
  isNewDoc,
  id,
  data,
  dataRef,
  hasUnsavedChanges,
  saving,
  validate,
  publishStatusRef,
  workflowStatusRef,
  workflowReviewersRef,
  workflowCommentsRef,
  scheduledAtRef,
  translationsRef,
  fieldSettingsRef,
  publishStatus,
  workflowStatus,
  workflowReviewers,
  workflowComments,
  scheduledAt,
  translations,
  editorFieldSettings,
  setConflictData,
  conflictData,
}: any) {

  const navigate = useNavigate()
  const params = useParams<{ id?: string; slug?: string }>()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)

  const editorSetSaving = useEditorStore((s) => s.setSaving)
  const editorSetHasUnsavedChanges = useEditorStore((s) => s.setHasUnsavedChanges)
  const setStoreFieldErrors = useEditorStore((s) => s.setFieldErrors)
  const editorUpdateData = useEditorStore((s) => s.updateData)
  const editorSetData = useEditorStore((s) => s.setData)
  const setHistory = useEditorStore((s) => s.setHistory)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  
  const setPublishStatus = useWorkflowStore((s) => s.setPublishStatus)
  const setScheduledAt = useWorkflowStore((s) => s.setScheduledAt)
  const setWorkflowStatus = useWorkflowStore((s) => s.setWorkflowStatus)

 // Store latest state in refs so the timeout callback always reads fresh values
 const autoSaveStateRef = useRef<{ data: PageData | null; publishStatus: string; workflowStatus: string; workflowReviewers: any[]; workflowComments: any[]; scheduledAt: string; translations: any; fieldSettings: Record<string, any> }>({
 data: null, publishStatus: 'draft', workflowStatus: 'draft', workflowReviewers: [], workflowComments: [], scheduledAt: '', translations: {}, fieldSettings: {},
 })
 // Keep refs in sync with latest state
 useEffect(() => {
 autoSaveStateRef.current = {
 data, publishStatus, workflowStatus, workflowReviewers, workflowComments, scheduledAt, translations, fieldSettings: editorFieldSettings,
 }
 }, [data, publishStatus, workflowStatus, workflowReviewers, workflowComments, scheduledAt, translations, editorFieldSettings])

 useEffect(() => {
 if (!hasUnsavedChanges || saving) return
 if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
 saveTimeoutRef.current = setTimeout(() => {
 // Read from refs at fire time — always fresh
 const s = autoSaveStateRef.current
 if (!s.data) return
 // Build a handleSave-equivalent inline to avoid stale closure
 ;(async () => {
 if (!s.data) return
 const errors = validate(s.data)
 if (errors.length > 0) {
 const errorMap: Record<string, string> = {}
 errors.forEach(e => {
 const key = `${e.sectionId}:${e.fieldName}`
 errorMap[key] = e.message
 })
 setStoreFieldErrors(errorMap)
 toast.error(`${errors.length} validation error(s) found. Please fix the errors.`)
 return
 }
 // Clear errors
 setStoreFieldErrors({})
 editorSetSaving(true)
 try {
 const autoTitleSection = (s.data?.sections || []).find((sec: any) => sec.blockType === 'pageTitle')
 const autoDescSection = (s.data?.sections || []).find((sec: any) => sec.blockType === 'pageDescription')
 const payload = {
 ...s.data,
 title: autoTitleSection?.content?.title ?? s.data?.title,
 heroDescription: autoDescSection?.content?.description ?? s.data?.heroDescription,
 sections: (s.data?.sections || []).map((sec: any) => {
 const { id, content, ...rest } = sec;
 return { ...rest, ...(sanitizeContent(content || {})) };
 }) || [],
 _status: s.publishStatus, workflowStatus: s.workflowStatus, reviewers: s.workflowReviewers, comments: s.workflowComments, scheduledAt: s.scheduledAt || undefined, publishedAt: s.publishStatus === 'published' ? (s.data.publishedAt || new Date().toISOString()) : null, i18n: s.translations, _fieldSettings: s.fieldSettings
 }
 if (isGlobal) {
 await api.patch(`/globals/${id}`, payload)
 } else if (isNewDoc) {
 const res = await api.post(`/${params.slug || 'pages'}`, payload)
 const newId = res.data?.data?._id || res.data?.data?.id
 if (newId) {
 navigate(`/collections/${params.slug || 'pages'}/${newId}`, { replace: true })
 }
 } else {
 await api.patch(`/${params.slug || 'pages'}/${id}`, payload)
 }
 editorSetHasUnsavedChanges(false)
 useEditorStore.getState().setLastSavedAt(new Date().toISOString())
 } catch { toast.error('Auto-save failed', { icon: '⚠️', duration: 3000 }) } finally { editorSetSaving(false) }
 })()
 }, 30000)
 return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
 }, [data, hasUnsavedChanges, saving, isGlobal, id, validate])


 const sanitizeContent = (content: Record<string, any>): Record<string, any> => {
 const cleaned: Record<string, any> = {}
 for (const [key, val] of Object.entries(content)) {
 if (val === '' || val === null || val === undefined) continue
 if (Array.isArray(val) && val.length === 0) continue
 if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) continue
 cleaned[key] = val
 }
 return cleaned
 }

 const handleSave = async () => {
 if (isSavingRef.current) return
 isSavingRef.current = true
 const latest = dataRef.current
 if (!latest) { isSavingRef.current = false; return }
 const errors = validate(latest)
 if (errors.length > 0) {
 const errorMap: Record<string, string> = {}
 errors.forEach(e => {
 const key = `${e.sectionId}:${e.fieldName}`
 errorMap[key] = e.message
 })
 setStoreFieldErrors(errorMap)
 toast.error(`${errors.length} validation error(s) found. Please fix the errors before saving.`)
 isSavingRef.current = false
 return
 }
 setStoreFieldErrors({})
 if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
 editorSetSaving(true)
 let savedVersion: number | undefined
 try {
 const pStatus = publishStatusRef.current
 // Extract pageTitle/pageDescription from sections back to root fields for backward compat
 const pageTitleSection = (latest.sections || []).find((s: any) => s.blockType === 'pageTitle')
 const pageDescSection = (latest.sections || []).find((s: any) => s.blockType === 'pageDescription')
 const payload = {
 ...latest,
 title: pageTitleSection?.content?.title ?? latest.title,
 heroDescription: pageDescSection?.content?.description ?? latest.heroDescription,
 sections: (latest.sections || []).map((s: any) => {
 const { id, content, ...rest } = s;
 return { ...rest, ...sanitizeContent(content || {}) };
 }) || [],
 _status: pStatus, workflowStatus: workflowStatusRef.current, reviewers: workflowReviewersRef.current, comments: workflowCommentsRef.current, scheduledAt: scheduledAtRef.current || undefined, publishedAt: pStatus === 'published' ? (latest.publishedAt || new Date().toISOString()) : null, i18n: translationsRef.current, _fieldSettings: fieldSettingsRef.current
 }
 let res;
 if (isGlobal) {
 res = await api.patch(`/globals/${id}`, payload)
 } else if (isNewDoc) {
 res = await api.post(`/${params.slug || 'pages'}`, payload)
 } else {
 res = await api.patch(`/${params.slug || 'pages'}/${id}`, payload)
 }
 savedVersion = res.data.data?._version
 const newId = res.data?.data?._id || res.data?.data?.id
 editorSetHasUnsavedChanges(false)
 useEditorStore.getState().setLastSavedAt(new Date().toISOString())
 toast.success(pStatus === 'published' ? '✨ Published!' : '📝 Saved as Draft', {})
 
 if (isNewDoc && newId) {
 navigate(`/collections/${params.slug || 'pages'}/${newId}`, { replace: true })
 }
 } catch (err: any) {
 if (err?.response?.status === 409) {
 const serverMsg = err?.response?.data?.error?.message || ''
 const serverVerMatch = serverMsg.match(/current\s+(\d+)/i)
 setConflictData({
 open: true,
 message: serverMsg,
 serverVersion: serverVerMatch ? parseInt(serverVerMatch[1]) : (err?.response?.data?.data?.currentVersion ?? undefined),
 localVersion: latest._version ?? undefined,
 })
 editorSetSaving(false)
 isSavingRef.current = false
 return
 }
 toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to save changes')
 editorSetSaving(false)
 isSavingRef.current = false
 return
 }
 editorSetSaving(false)
 isSavingRef.current = false
 if (savedVersion !== undefined) {
 editorUpdateData((draft) => { draft._version = savedVersion })
 const collectionName = isGlobal ? 'globals' : (params.slug || 'pages')
 api.get(`/versions/${collectionName}/${id}`)
 .then((res) => setHistory(res.data.data || []))
 .catch(() => {})
 }
 }

 const handleUndo = () => { undo(); toast.success('Undone', { icon: '↩️' }) }
 const handleRedo = () => { redo(); toast.success('Redone', { icon: '↪️' }) }
 const handleReload = async () => {
 toast.loading('Reloading server version...', { id: 'conflict' })
 try {
 const collectionSlug = params.slug || 'pages'
 const res = isGlobal
 ? await api.get(`/globals/${id}`)
 : await api.get(`/${collectionSlug}/${id}`)
 const serverData = res.data.data
 const normalized = {
 ...serverData,
 sections: (serverData.sections || []).map((s: any) => ({
 ...s,
 id: s.id || uid(),
 content: s.content || s.blockData || {},
 })),
 }
 editorSetData(normalized as PageData)
 editorSetHasUnsavedChanges(false)
 setConflictData({ open: false })
 toast.success('Reloaded server version', { id: 'conflict' })
 } catch {
 toast.error('Failed to reload', { id: 'conflict' })
 }
 }
 const handleForceSave = async () => {
 const latest = dataRef.current
 if (!latest) return
 toast.loading('Force-saving your version...', { id: 'conflict' })
 try {
 const forceTitleSection = (latest.sections || []).find((s: any) => s.blockType === 'pageTitle')
 const forceDescSection = (latest.sections || []).find((s: any) => s.blockType === 'pageDescription')
 const payload = {
 ...latest,
 title: forceTitleSection?.content?.title ?? latest.title,
 heroDescription: forceDescSection?.content?.description ?? latest.heroDescription,
 sections: (latest.sections || []).map((s: any) => {
 const { id, content, ...rest } = s;
 return { ...rest, ...sanitizeContent(content || {}) };
 }) || [],
 _version: conflictData.serverVersion !== undefined ? conflictData.serverVersion : latest._version,
 _status: publishStatusRef.current, workflowStatus: workflowStatusRef.current, reviewers: workflowReviewersRef.current, comments: workflowCommentsRef.current, scheduledAt: scheduledAtRef.current || undefined, publishedAt: publishStatusRef.current === 'published' ? (latest.publishedAt || new Date().toISOString()) : null, i18n: translationsRef.current, _fieldSettings: fieldSettingsRef.current
 }
 let res;
 if (isGlobal) {
 res = await api.patch(`/globals/${id}`, payload)
 } else if (isNewDoc) {
 res = await api.post(`/${params.slug || 'pages'}`, payload)
 } else {
 res = await api.patch(`/${params.slug || 'pages'}/${id}`, payload)
 }
 const newVersion = res.data.data?._version
 const newId = res.data?.data?._id || res.data?.data?.id
 if (newVersion !== undefined) editorSetData({ ...latest, _version: newVersion })
 editorSetHasUnsavedChanges(false)
 useEditorStore.getState().setLastSavedAt(new Date().toISOString())
 setConflictData({ open: false })
 toast.success('Force-saved your version', { id: 'conflict' })
 
 if (isNewDoc && newId) {
 navigate(`/collections/${params.slug || 'pages'}/${newId}`, { replace: true })
 }
 } catch (err: any) {
 const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Force-save failed'
 toast.error(serverMsg, { id: 'conflict' })
 }
 }

 const handlePublish = async () => { setPublishStatus('published'); await handleSave() }
 const handleUnpublish = async () => { setPublishStatus('draft'); setScheduledAt(''); useWorkflowStore.getState().setWorkflowStatus('draft'); toast.success('Unpublished - now visible only to editors') }


  return { handleSave, handleUndo, handleRedo, handleReload, handleForceSave, handlePublish, handleUnpublish }

}
