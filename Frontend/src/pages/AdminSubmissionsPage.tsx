import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { SafeImage } from '../components/SafeImage';

type ModerationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DUPLICATE'
  | 'PROMOTION_FAILED'
  | 'NEEDS_MORE_INFO';

type SortField = 'submittedAt' | 'updatedAt' | 'name' | 'cityRegency' | 'status';
type ReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'MARK_DUPLICATE';

type Submitter = { id: string; fullName: string; email?: string };

type Submission = {
  id: string;
  name: string;
  category: string;
  address: string;
  cityRegency: string;
  district?: string;
  description?: string;
  primaryPhotoUrl?: string;
  status: ModerationStatus;
  submittedAt: string;
  updatedAt?: string;
  rejectionReason?: string;
  moderationNotes?: string;
  duplicateOfId?: string;
  duplicateConfidence?: number;
  promotionError?: string;
  canonicalId?: string;
  promotedAt?: string;
  latitude?: number;
  longitude?: number;
  submitter?: Submitter;
  _count?: { votes: number; comments: number };
};

type SubmissionPage = {
  data: Submission[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const PAGE_SIZE = 20;
const statuses: Array<{ value: ModerationStatus | ''; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'PROMOTION_FAILED', label: 'Promotion failed' },
];

const statusStyles: Record<ModerationStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  UNDER_REVIEW: 'bg-sky-50 text-sky-700 ring-sky-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
  DUPLICATE: 'bg-violet-50 text-violet-700 ring-violet-200',
  PROMOTION_FAILED: 'bg-orange-50 text-orange-700 ring-orange-200',
  NEEDS_MORE_INFO: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const statusLabels: Record<ModerationStatus, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
  PROMOTION_FAILED: 'Promotion failed',
  NEEDS_MORE_INFO: 'Needs info',
};

function unwrap<T>(response: { data?: unknown }): T {
  const body = response.data as { data?: unknown } | T;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ring-1 ring-inset ${statusStyles[status] || statusStyles.NEEDS_MORE_INFO}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export const AdminSubmissionsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<SubmissionPage>({ data: [], meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 } });
  const [status, setStatus] = useState<ModerationStatus | ''>('PENDING');
  const [citySearch, setCitySearch] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [duplicateThreshold, setDuplicateThreshold] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Submission | null>(null);
  const [dialog, setDialog] = useState<{ action: ReviewAction | 'PROMOTE' | 'RETRY'; submission: Submission; reason: string; duplicateOfId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/admin/places/submissions', {
        params: { status: status || undefined, cityRegency: cityQuery || undefined, page, limit: PAGE_SIZE, sortBy, sortOrder },
      });
      const body = response.data as SubmissionPage;
      setQueue({
        data: body.data || [],
        meta: body.meta || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
      });
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Tidak dapat memuat antrean moderasi. Coba lagi.');
      setQueue((current) => ({ ...current, data: [] }));
    } finally {
      setIsLoading(false);
    }
  }, [cityQuery, page, sortBy, sortOrder, status]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const filteredQueue = useMemo(() => queue.data.filter((submission) => {
    const submitted = new Date(submission.submittedAt).getTime();
    const afterFrom = !fromDate || submitted >= new Date(`${fromDate}T00:00:00`).getTime();
    const beforeTo = !toDate || submitted <= new Date(`${toDate}T23:59:59`).getTime();
    const confidence = submission.duplicateConfidence == null ? 0 : submission.duplicateConfidence * 100;
    const aboveThreshold = !duplicateThreshold || confidence >= Number(duplicateThreshold);
    return afterFrom && beforeTo && aboveThreshold;
  }), [duplicateThreshold, fromDate, queue.data, toDate]);

  const setSort = (field: SortField) => {
    if (field === sortBy) setSortOrder((current) => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder(field === 'name' || field === 'cityRegency' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const applyCitySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setCityQuery(citySearch.trim());
  };

  const openDetail = async (submission: Submission) => {
    setDetail(submission);
    try {
      const response = await apiClient.get(`/admin/places/submissions/${submission.id}`);
      setDetail(unwrap<Submission>(response));
    } catch {
      // The list row remains useful if the optional detail request fails.
    }
  };

  const runAction = async () => {
    if (!dialog) return;
    const { action, submission, reason, duplicateOfId } = dialog;
    if (action === 'REJECT' && !reason.trim()) return;
    if (action === 'MARK_DUPLICATE' && !duplicateOfId.trim()) return;
    setIsSaving(true);
    try {
      if (action === 'PROMOTE' || action === 'RETRY') {
        await apiClient.patch(`/admin/places/submissions/${submission.id}/promote`);
      } else {
        await apiClient.patch(`/admin/places/submissions/${submission.id}/review`, {
          action,
          rejectionReason: action === 'REJECT' ? reason.trim() : undefined,
          moderationNotes: action === 'REQUEST_INFO' ? reason.trim() : undefined,
          duplicateOfId: action === 'MARK_DUPLICATE' ? duplicateOfId.trim() : undefined,
        });
      }
      setDialog(null);
      await loadQueue();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Aksi moderasi gagal dilakukan.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setStatus('PENDING');
    setCitySearch('');
    setCityQuery('');
    setFromDate('');
    setToDate('');
    setDuplicateThreshold('');
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#f4f8fa] px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-teal-700"><ShieldCheck className="h-4 w-4" /> Operations / moderation</div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Submission queue</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tinjau tempat baru sebelum masuk ke katalog KelanaLampung. Prioritaskan pengajuan yang masih menunggu keputusan.</p>
          </div>
          <button type="button" onClick={() => void loadQueue()} className="inline-flex h-10 min-h-[44px] items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-700 lg:self-auto focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"><RefreshCw className="h-3.5 w-3.5" /> Refresh queue</button>
        </header>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_40px_-25px_rgba(15,23,42,0.35)] sm:p-5">
          <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-700"><Filter className="h-4 w-4 text-teal-600" /> Filter queue</div><button type="button" onClick={resetFilters} className="text-[11px] font-bold text-slate-600 transition hover:text-teal-700 min-h-[44px] px-2 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none">Reset filters</button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-[11px] font-bold text-slate-600">Status<select value={status} onChange={(event) => { setStatus(event.target.value as ModerationStatus | ''); setPage(1); }} className="mt-1.5 h-11 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-teal-500">{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <form onSubmit={applyCitySearch} className="text-[11px] font-bold text-slate-600 sm:col-span-2 lg:col-span-2">City / regency<div className="relative mt-1.5"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="Cari wilayah…" className="h-11 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-teal-500" /></div></form>
            <label className="text-[11px] font-bold text-slate-600">From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1.5 h-11 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-teal-500" /></label>
            <label className="text-[11px] font-bold text-slate-600">To<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1.5 h-11 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-teal-500" /></label>
            <label className="text-[11px] font-bold text-slate-600">Duplicate score ≥<div className="relative mt-1.5"><input type="number" min="0" max="100" value={duplicateThreshold} onChange={(event) => setDuplicateThreshold(event.target.value)} placeholder="0–100" className="h-11 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus:border-teal-500" /><span className="absolute right-3 top-3.5 text-[10px] text-slate-500">%</span></div></label>
          </div>
        </section>

        {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_-35px_rgba(15,23,42,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div><p className="text-sm font-extrabold text-slate-900">Moderation inbox</p><p className="mt-0.5 text-[11px] text-slate-400">{queue.meta.total.toLocaleString('id-ID')} total records · halaman {queue.meta.page} dari {Math.max(queue.meta.totalPages, 1)}</p></div><div className="rounded-full bg-teal-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-teal-700">{filteredQueue.length} visible</div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left"><thead className="bg-slate-50/80"><tr>{[['id', 'ID'], ['name', 'Name'], ['category', 'Category'], ['cityRegency', 'City / Regency'], ['submitter', 'Submitter'], ['status', 'Status'], ['submittedAt', 'Submitted at']].map(([field, label]) => <th key={field} className="whitespace-nowrap px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 first:pl-5">{field === 'submitter' ? label : <button type="button" onClick={() => setSort(field as SortField)} className="inline-flex items-center gap-1 min-h-[44px] px-2 transition hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none">{label}{sortBy === field && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</button>}</th>)}<th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 last:pr-5">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{isLoading ? <tr><td colSpan={8} className="px-5 py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" /><p className="mt-3 text-xs font-semibold text-slate-400">Memuat antrean…</p></td></tr> : filteredQueue.length === 0 ? <tr><td colSpan={8} className="px-5 py-16 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search className="h-5 w-5" /></div><p className="mt-3 text-sm font-bold text-slate-700">Tidak ada pengajuan yang cocok</p><p className="mt-1 text-xs text-slate-400">Coba ubah filter atau refresh queue.</p></td></tr> : filteredQueue.map((submission) => <SubmissionRow key={submission.id} submission={submission} onDetail={openDetail} onAction={(action) => setDialog({ action, submission, reason: '', duplicateOfId: '' })} />)}</tbody></table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5"><p className="text-[11px] font-semibold text-slate-500">Menampilkan {queue.meta.total === 0 ? 0 : (queue.meta.page - 1) * PAGE_SIZE + 1}–{Math.min(queue.meta.page * PAGE_SIZE, queue.meta.total)} dari {queue.meta.total}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="inline-flex h-9 min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"><ChevronLeft className="h-3.5 w-3.5" /> Prev</button><button type="button" disabled={page >= queue.meta.totalPages || isLoading} onClick={() => setPage((current) => current + 1)} className="inline-flex h-9 min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none">Next <ChevronRight className="h-3.5 w-3.5" /></button></div></div>
        </section>
      </div>

      {detail && <DetailModal submission={detail} onClose={() => setDetail(null)} />}
      {dialog && <ActionModal dialog={dialog} isSaving={isSaving} onChange={(changes) => setDialog((current) => current ? { ...current, ...changes } : current)} onClose={() => !isSaving && setDialog(null)} onConfirm={() => void runAction()} />}
    </main>
  );
};

function SubmissionRow({ submission, onDetail, onAction }: { submission: Submission; onDetail: (submission: Submission) => void; onAction: (action: ReviewAction | 'PROMOTE' | 'RETRY') => void }) {
  const canReview = ['PENDING', 'UNDER_REVIEW', 'NEEDS_MORE_INFO'].includes(submission.status);
  const canPromote = submission.status === 'APPROVED';
  const canRetry = submission.status === 'PROMOTION_FAILED';
  return <tr className="group transition hover:bg-teal-50/30"><td className="whitespace-nowrap px-4 py-3 pl-5 font-mono text-[10px] font-bold text-slate-400" title={submission.id}>{submission.id.slice(0, 8)}…</td><td className="max-w-[220px] px-4 py-3"><button type="button" onClick={() => onDetail(submission)} className="text-left"><p className="truncate text-xs font-extrabold text-slate-800 transition group-hover:text-teal-700">{submission.name}</p><p className="mt-0.5 max-w-[210px] truncate text-[10px] text-slate-400">{submission.address}</p></button></td><td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600">{submission.category}</td><td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600">{submission.cityRegency}</td><td className="max-w-[130px] px-4 py-3 text-xs text-slate-600"><span className="block truncate font-semibold">{submission.submitter?.fullName || 'Anonymous'}</span><span className="block truncate text-[10px] text-slate-400">{submission.submitter?.email || '—'}</span></td><td className="px-4 py-3"><StatusBadge status={submission.status} />{submission.duplicateConfidence != null && <span className="mt-1 block text-[10px] font-bold text-violet-500">dup {Math.round(submission.duplicateConfidence * 100)}%</span>}</td><td className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-slate-500">{formatDate(submission.submittedAt)}</td><td className="px-4 py-3 pr-5"><div className="flex min-w-[240px] justify-end gap-1.5"><IconAction label="View detail" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => onDetail(submission)} />{canReview && <><IconAction label="Approve" tone="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onAction('APPROVE')} /><IconAction label="Reject" tone="danger" icon={<X className="h-3.5 w-3.5" />} onClick={() => onAction('REJECT')} /><IconAction label="Request info" icon={<HelpCircle className="h-3.5 w-3.5" />} onClick={() => onAction('REQUEST_INFO')} /><IconAction label="Mark duplicate" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => onAction('MARK_DUPLICATE')} /></>}{canPromote && <IconAction label="Promote" tone="success" icon={<ArrowUp className="h-3.5 w-3.5" />} onClick={() => onAction('PROMOTE')} />}{canRetry && <IconAction label="Retry promotion" tone="warning" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => onAction('RETRY')} />}</div></td></tr>;
}

function IconAction({ label, icon, onClick, tone = 'neutral' }: { label: string; icon: React.ReactNode; onClick: () => void; tone?: 'neutral' | 'success' | 'danger' | 'warning' }) {
  const tones = { neutral: 'border-slate-200 text-slate-500 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700', success: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50', danger: 'border-rose-200 text-rose-600 hover:bg-rose-50', warning: 'border-orange-200 text-orange-600 hover:bg-orange-50' };
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border bg-white transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${tones[tone]}`}>{icon}</button>;
}

function DetailModal({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  return (
    <Modal title="Submission detail" onClose={onClose}>
      <div className="space-y-5">
        {submission.primaryPhotoUrl && (
          <SafeImage
            src={submission.primaryPhotoUrl}
            alt={`Foto pengajuan ${submission.name}`}
            className="h-40 w-full rounded-2xl object-cover"
            fallbackSrc="/assets/images/heroes/hero-pahawang-bg.png"
          />
        )}
        {submission.description && <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{submission.description}</p>}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <DetailItem label="Status"><StatusBadge status={submission.status} /></DetailItem>
          <DetailItem label="Submitted at">{formatDate(submission.submittedAt)}</DetailItem>
          <DetailItem label="Category">{submission.category}</DetailItem>
          <DetailItem label="Submitter">{submission.submitter?.fullName || 'Anonymous'}</DetailItem>
          <DetailItem label="Address">{submission.address}, {submission.cityRegency}</DetailItem>
          <DetailItem label="Coordinates">{submission.latitude ?? '—'}, {submission.longitude ?? '—'}</DetailItem>
        </div>
        {(submission.rejectionReason || submission.moderationNotes || submission.promotionError) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            {submission.rejectionReason || submission.moderationNotes || submission.promotionError}
          </div>
        )}
      </div>
    </Modal>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) { return <div><dt className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">{label}</dt><dd className="font-semibold leading-5 text-slate-700">{children}</dd></div>; }

function ActionModal({ dialog, isSaving, onChange, onClose, onConfirm }: { dialog: { action: ReviewAction | 'PROMOTE' | 'RETRY'; submission: Submission; reason: string; duplicateOfId: string }; isSaving: boolean; onChange: (changes: Partial<typeof dialog>) => void; onClose: () => void; onConfirm: () => void }) {
  const isReview = !['PROMOTE', 'RETRY'].includes(dialog.action);
  const titles: Record<typeof dialog.action, string> = { APPROVE: 'Approve submission', REJECT: 'Reject submission', REQUEST_INFO: 'Request more information', MARK_DUPLICATE: 'Mark as duplicate', PROMOTE: 'Promote to catalog', RETRY: 'Retry promotion' };
  const needsText = dialog.action === 'REJECT' || dialog.action === 'REQUEST_INFO';
  return <Modal title={titles[dialog.action]} onClose={onClose}><div className="space-y-5"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-extrabold text-slate-800">{dialog.submission.name}</p><p className="mt-1 text-[11px] text-slate-500">{dialog.submission.cityRegency} · {dialog.submission.id.slice(0, 12)}…</p></div>{dialog.action === 'APPROVE' && <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-xs font-extrabold">XP reward preview</p><p className="mt-1 text-xs leading-5">Submitter akan menerima <strong>+50 XP</strong> saat tempat dipromosikan ke katalog.</p></div></div>}{needsText && <label className="block text-xs font-bold text-slate-600">{dialog.action === 'REJECT' ? 'Alasan penolakan (wajib)' : 'Informasi yang perlu dilengkapi'}<textarea autoFocus value={dialog.reason} onChange={(event) => onChange({ reason: event.target.value })} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal text-slate-800 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" placeholder={dialog.action === 'REJECT' ? 'Jelaskan alasan penolakan…' : 'Tuliskan informasi yang perlu diminta…'} /></label>}{dialog.action === 'MARK_DUPLICATE' && <label className="block text-xs font-bold text-slate-600">ID submission / tempat asli (wajib)<input autoFocus value={dialog.duplicateOfId} onChange={(event) => onChange({ duplicateOfId: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" placeholder="UUID submission asli" /></label>}{isReview && dialog.action !== 'APPROVE' && dialog.action !== 'REJECT' && dialog.action !== 'REQUEST_INFO' && dialog.action !== 'MARK_DUPLICATE' ? null : <p className="text-xs leading-5 text-slate-500">Aksi ini akan dicatat di audit log moderasi dan langsung memperbarui status pengajuan.</p>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={isSaving} onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">Cancel</button><button type="button" disabled={isSaving || (dialog.action === 'REJECT' && !dialog.reason.trim()) || (dialog.action === 'MARK_DUPLICATE' && !dialog.duplicateOfId.trim())} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Confirm action</button></div></div></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/70 bg-white p-5 shadow-2xl sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900">{title}</h2><button type="button" onClick={onClose} className="rounded-full p-2.5 min-w-[44px] min-h-[44px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none" aria-label="Close modal"><X className="h-4 w-4" /></button></div>{children}</section></div>;
}
